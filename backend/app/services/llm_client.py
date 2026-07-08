import time
import json
import logging
from typing import List, Dict, Any, Type, TypeVar, Tuple
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.config import settings
from app.models.llm_call import LLMCall
from app.services.token_estimator import estimate_token_count
from app.schemas.debug_report import DebugReportOutput, EvidenceItem

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

class LLMClient:
    @classmethod
    def generate_structured(
        cls,
        db: Session,
        project_id: int,
        purpose: str,
        system_prompt: str,
        user_prompt: str,
        retrieved_chunks: List[Dict[str, Any]],
        response_model: Type[T]
    ) -> T:
        start_time = time.time()
        provider = settings.LLM_PROVIDER.lower()
        model_name = settings.LLM_MODEL
        
        input_token_count = estimate_token_count(system_prompt + " " + user_prompt)

        try:
            if provider == "openai" and settings.OPENAI_API_KEY:
                output_obj, output_token_count = cls._call_openai(
                    system_prompt, user_prompt, response_model
                )
            else:
                output_obj, output_token_count = cls._call_mock(
                    user_prompt, retrieved_chunks, response_model
                )
            status_str = "success"
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            status_str = f"error: {str(e)}"
            raise e
        finally:
            latency_ms = (time.time() - start_time) * 1000.0
            cost = (input_token_count * 0.00000015) + (output_token_count * 0.00000060)

            try:
                llm_entry = LLMCall(
                    project_id=project_id,
                    purpose=purpose,
                    model_name=model_name,
                    input_tokens=input_token_count,
                    output_tokens=output_token_count,
                    latency_ms=round(latency_ms, 2),
                    estimated_cost=round(cost, 6),
                    status=status_str
                )
                db.add(llm_entry)
                db.commit()
            except Exception as db_err:
                logger.error(f"Failed to record LLM call telemetry: {db_err}")
                db.rollback()

        return output_obj

    @classmethod
    def _call_mock(
        cls,
        user_prompt: str,
        retrieved_chunks: List[Dict[str, Any]],
        response_model: Type[T]
    ) -> Tuple[T, int]:
        # Extract query text from user_prompt
        query_text = "CI failure analysis"
        if "User Query:" in user_prompt:
            try:
                query_text = user_prompt.split("User Query:")[1].split("\n")[0].strip()
            except Exception:
                pass

        if not retrieved_chunks:
            mock_data = DebugReportOutput(
                failure_type="unknown",
                summary=f"No relevant evidence chunks retrieved for query '{query_text}'.",
                likely_root_cause=None,
                evidence=[],
                suggested_fix=None,
                confidence=0.1,
                missing_information=["No matching code files or failure logs were found in the database."]
            )
            text_str = json.dumps(mock_data.model_dump())
            return mock_data, estimate_token_count(text_str)

        # Build evidence list from real chunk IDs
        evidence_items = []
        for c in retrieved_chunks:
            cid = c.get("chunk_id") or c.get("id")
            if cid:
                fp = c.get("file_path") or "source file"
                sym = c.get("symbol_name") or ""
                reason = f"Contains relevant code snippet in {fp}" if fp else "Contains relevant log trace."
                if sym:
                    reason += f" for symbol '{sym}'"
                evidence_items.append(EvidenceItem(
                    chunk_id=cid,
                    file_path=c.get("file_path"),
                    start_line=c.get("start_line"),
                    end_line=c.get("end_line"),
                    reason=reason
                ))

        top_chunk = retrieved_chunks[0]
        top_file = top_chunk.get("file_path") or "retrieved codebase"
        top_symbol = top_chunk.get("symbol_name") or ""
        top_preview = top_chunk.get("content_preview") or ""
        chunk_type = top_chunk.get("chunk_type") or "code"

        # Dynamically determine failure_type
        if "pytest" in chunk_type or "test" in query_text.lower() or "assert" in top_preview.lower():
            failure_type = "test_failure"
        elif "stack_trace" in chunk_type or "exception" in top_preview.lower() or "error" in top_preview.lower():
            failure_type = "runtime_error"
        else:
            failure_type = "unknown"

        # Dynamically construct query-driven summary, root_cause, and fix
        summary = f"Analysis for query '{query_text}' identified relevant evidence in {top_file}."
        if top_symbol:
            summary += f" (symbol: '{top_symbol}')"

        snippet_clean = top_preview.replace("\n", " ").strip()
        if len(snippet_clean) > 120:
            snippet_clean = snippet_clean[:120] + "..."

        if top_symbol:
            root_cause = f"The issue is located near symbol '{top_symbol}' in {top_file}. Relevant content: '{snippet_clean}'"
        else:
            root_cause = f"The issue is located in {top_file}. Relevant content snippet: '{snippet_clean}'"

        suggested_fix = f"Inspect and update the implementation in {top_file} to resolve the issue for query '{query_text}'."

        confidence = round(min(0.95, max(0.65, 0.70 + (len(retrieved_chunks) * 0.05))), 2)

        report_output = DebugReportOutput(
            failure_type=failure_type,
            summary=summary,
            likely_root_cause=root_cause,
            evidence=evidence_items,
            suggested_fix=suggested_fix,
            confidence=confidence,
            missing_information=[]
        )

        out_str = json.dumps(report_output.model_dump())
        return report_output, estimate_token_count(out_str)

    @classmethod
    def _call_openai(
        cls,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T]
    ) -> Tuple[T, int]:
        import httpx
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}"
        }
        payload = {
            "model": settings.LLM_MODEL,
            "temperature": settings.LLM_TEMPERATURE,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"}
        }

        response = httpx.post(url, json=payload, headers=headers, timeout=60.0)
        response.raise_for_status()

        data = response.json()
        raw_content = data["choices"][0]["message"]["content"]
        tokens_used = data.get("usage", {}).get("completion_tokens", estimate_token_count(raw_content))

        parsed_json = json.loads(raw_content)
        parsed_obj = response_model.model_validate(parsed_json)
        return parsed_obj, tokens_used
