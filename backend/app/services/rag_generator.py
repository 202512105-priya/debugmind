import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.uploaded_log import UploadedLog
from app.models.debug_report import DebugReport
from app.models.debug_report_evidence import DebugReportEvidence
from app.services.hybrid_search import HybridSearchService
from app.services.reranker import RelevanceReranker
from app.services.llm_client import LLMClient
from app.schemas.debug_report import DebugReportOutput, DebugReportRead, EvidenceItem
from app.core.config import settings

logger = logging.getLogger(__name__)

class RAGDebugReportService:
    SYSTEM_PROMPT = """You are DebugMind, an AI debugging assistant for software engineers.

Task:
Analyze the CI failure and user query using ONLY the provided evidence chunks.

Rules:
- Do not invent files, functions, commits, or root causes.
- Every claim must cite a valid chunk_id present in the evidence context.
- If evidence is insufficient to diagnose the root cause, set likely_root_cause to null and list what missing information is needed.
- Confidence must be a number between 0.0 and 1.0.
- Return ONLY valid JSON matching the specified schema.
"""

    @classmethod
    def format_context(cls, retrieved_chunks: List[Dict[str, Any]]) -> str:
        if not retrieved_chunks:
            return "No evidence chunks available."

        formatted_blocks = []
        for idx, item in enumerate(retrieved_chunks, start=1):
            chunk = item.get("chunk")
            cid = item.get("chunk_id") or (chunk.id if chunk else None)
            file_path = item.get("file_path") or (chunk.file_path if chunk else "N/A")
            start_line = item.get("start_line") or (chunk.start_line if chunk else None)
            end_line = item.get("end_line") or (chunk.end_line if chunk else None)
            symbol_name = item.get("symbol_name") or (chunk.symbol_name if chunk else None)
            chunk_type = item.get("chunk_type") or (chunk.chunk_type if chunk else "chunk")
            content = chunk.content if chunk else item.get("content_preview", "")

            block = f"""--- EVIDENCE CHUNK #{idx} [chunk_id: {cid}] ---
type: {chunk_type} | file: {file_path} (lines {start_line}-{end_line}) | symbol: {symbol_name}
content:
{content}
"""
            formatted_blocks.append(block)

        return "\n".join(formatted_blocks)

    @classmethod
    def validate_citations(
        cls,
        report: DebugReportOutput,
        valid_chunk_ids: set
    ) -> DebugReportOutput:
        # Filter out hallucinated chunk_ids that were not in the retrieved evidence set
        filtered_evidence = [
            ev for ev in report.evidence
            if ev.chunk_id in valid_chunk_ids
        ]
        report.evidence = filtered_evidence

        # If evidence was wiped out or likely_root_cause has zero valid citations, flag abstention
        if report.missing_information is None:
            report.missing_information = []

        if not filtered_evidence and report.likely_root_cause:
            report.confidence = min(report.confidence, 0.4)
            if "Citations were unverified against retrieved evidence." not in report.missing_information:
                report.missing_information.append("Citations were unverified against retrieved evidence.")

        return report

    @classmethod
    def generate_report(
        cls,
        db: Session,
        project_id: int,
        uploaded_log_id: Optional[int] = None,
        user_query: Optional[str] = None,
        top_k: int = 5
    ) -> DebugReport:
        # 1. Prepare search query and log context
        log_content = ""
        if uploaded_log_id:
            log = db.query(UploadedLog).filter(UploadedLog.id == uploaded_log_id).first()
            if log and log.raw_content:
                log_content = log.raw_content[:500]  # snippet for query expansion

        search_query_parts = []
        if user_query:
            search_query_parts.append(user_query)
        if log_content:
            search_query_parts.append(log_content[:200])

        effective_query = " ".join(search_query_parts) if search_query_parts else "CI failure error"

        # Parse target scope filter
        target_source_type = None
        if user_query and ("[Target Scope: Source Code Files]" in user_query or "[Target Scope: Code]" in user_query):
            target_source_type = "code"
        elif user_query and ("[Target Scope: CI Failure Logs]" in user_query or "[Target Scope: Log]" in user_query):
            target_source_type = "log"

        # 2. Retrieve top evidence chunks using Two-Stage Hybrid Retrieval + Reranking
        hybrid_candidates = HybridSearchService.search_hybrid(
            db=db,
            project_id=project_id,
            query=effective_query,
            top_k=top_k * 3,
            alpha=0.65,
            source_type=target_source_type,
            uploaded_log_id=uploaded_log_id
        )

        reranked_results = RelevanceReranker.rerank(
            query=effective_query,
            candidates=hybrid_candidates,
            top_k=top_k
        )

        # Map candidate chunks for prompt context formatting
        retrieved_items = []
        valid_chunk_ids = set()
        for r in reranked_results:
            cid = r["chunk_id"]
            valid_chunk_ids.add(cid)
            # Find candidate object in hybrid_candidates
            cand = next((c for c in hybrid_candidates if c["chunk_id"] == cid), None)
            if cand:
                retrieved_items.append(cand)

        # 3. Format context string
        context_str = cls.format_context(retrieved_items)

        # 4. Construct user prompt
        user_prompt = f"""User Query: {user_query or 'Analyze CI failure'}

Evidence Context:
{context_str}

Please generate a grounded, structured debug report matching the JSON schema.
"""

        # 5. Invoke LLM Client
        report_output = LLMClient.generate_structured(
            db=db,
            project_id=project_id,
            purpose="debug_report_generation",
            system_prompt=cls.SYSTEM_PROMPT,
            user_prompt=user_prompt,
            retrieved_chunks=retrieved_items,
            response_model=DebugReportOutput
        )

        # 6. Validate citations against retrieved chunk IDs
        validated_report = cls.validate_citations(report_output, valid_chunk_ids)

        # Determine report status
        status_str = "success"
        if not validated_report.likely_root_cause or validated_report.confidence < 0.4:
            status_str = "insufficient_evidence"

        # 7. Persist DebugReport and DebugReportEvidence to database
        db_report = DebugReport(
            project_id=project_id,
            uploaded_log_id=uploaded_log_id,
            query=user_query or effective_query,
            failure_type=validated_report.failure_type,
            summary=validated_report.summary,
            likely_root_cause=validated_report.likely_root_cause,
            suggested_fix=validated_report.suggested_fix,
            confidence=validated_report.confidence,
            status=status_str,
            model_name=settings.LLM_MODEL,
            missing_information=json.dumps(validated_report.missing_information) if validated_report.missing_information else None
        )
        db.add(db_report)
        db.flush()  # gets db_report.id

        for ev in validated_report.evidence:
            db_ev = DebugReportEvidence(
                debug_report_id=db_report.id,
                chunk_id=ev.chunk_id,
                file_path=ev.file_path,
                start_line=ev.start_line,
                end_line=ev.end_line,
                reason=ev.reason
            )
            db.add(db_ev)

        db.commit()
        db.refresh(db_report)
        return db_report
