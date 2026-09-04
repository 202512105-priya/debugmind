import time
import json
import re
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from langchain_core.runnables import RunnableConfig

from app.agents.state import DebugAgentState
from app.models.uploaded_log import UploadedLog
from app.models.agent_step import AgentStep
from app.services.hybrid_search import HybridSearchService
from app.services.reranker import RelevanceReranker
from app.services.rag_generator import RAGDebugReportService

logger = logging.getLogger(__name__)

def get_db_from_config(config: Optional[RunnableConfig]) -> Optional[Session]:
    if not config:
        return None
    if isinstance(config, dict):
        conf_dict = config.get("configurable", {})
        if isinstance(conf_dict, dict):
            return conf_dict.get("db")
    elif hasattr(config, "configurable"):
        conf_dict = getattr(config, "configurable")
        if isinstance(conf_dict, dict):
            return conf_dict.get("db")
    return None

def record_step(db: Optional[Session], run_id: int, step_name: str, input_data: Any, output_data: Any, latency_ms: float, status: str = "success"):
    if not db or not run_id:
        return
    try:
        step = AgentStep(
            agent_run_id=run_id,
            step_name=step_name,
            input_json=json.dumps(input_data, default=str),
            output_json=json.dumps(output_data, default=str),
            latency_ms=round(latency_ms, 2),
            status=status
        )
        db.add(step)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record step {step_name}: {e}")
        db.rollback()


def classifier_node(state: DebugAgentState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    start_time = time.time()
    db = get_db_from_config(config)
    run_id = state.get("agent_run_id", 0)
    query = state.get("query", "")
    log_id = state.get("uploaded_log_id")

    log_snippet = ""
    if db and log_id:
        log = db.query(UploadedLog).filter(UploadedLog.id == log_id).first()
        if log and log.raw_content:
            log_snippet = log.raw_content.lower()

    full_text = (query + " " + log_snippet).lower()

    if "failed" in full_text or "assert" in full_text or "test" in full_text:
        failure_type = "test_failure"
    elif "attributeerror" in full_text or "nullpointer" in full_text or "exception" in full_text:
        failure_type = "runtime_error"
    elif "build" in full_text or "compile" in full_text:
        failure_type = "build_failure"
    elif "module" in full_text or "import" in full_text or "dependency" in full_text:
        failure_type = "dependency_error"
    else:
        failure_type = "unknown"

    latency = (time.time() - start_time) * 1000.0
    input_payload = {"query": query, "uploaded_log_id": log_id}
    output_payload = {"failure_type": failure_type}
    
    record_step(db, run_id, "classifier", input_payload, output_payload, latency)

    return {"failure_type": failure_type}


def query_planner_node(state: DebugAgentState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    start_time = time.time()
    db = get_db_from_config(config)
    run_id = state.get("agent_run_id", 0)
    query = state.get("query", "")
    iteration = state.get("iteration_count", 0)

    queries = [query] if query else []
    
    # Extract query terms strictly from user input (avoid injecting fixed 401 strings)
    words = [w.strip() for w in re.findall(r"\w+", query) if len(w) > 3]
    if len(words) >= 2:
        sub_q = " ".join(words[:4])
        if sub_q not in queries:
            queries.append(sub_q)

    latency = (time.time() - start_time) * 1000.0
    input_payload = {"query": query, "iteration": iteration}
    output_payload = {"search_queries": queries}

    record_step(db, run_id, "query_planner", input_payload, output_payload, latency)

    return {"search_queries": queries}


def retriever_node(state: DebugAgentState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    start_time = time.time()
    db = get_db_from_config(config)
    run_id = state.get("agent_run_id", 0)
    project_id = state.get("project_id", 0)
    uploaded_log_id = state.get("uploaded_log_id")
    queries = state.get("search_queries", [])
    raw_query = state.get("query", "")

    # Parse target scope filter
    target_source_type = None
    if "[Target Scope: Source Code Files]" in raw_query or "[Target Scope: Code]" in raw_query:
        target_source_type = "code"
    elif "[Target Scope: CI Failure Logs]" in raw_query or "[Target Scope: Log]" in raw_query:
        target_source_type = "log"

    all_candidates = []
    seen_chunk_ids = set()

    if db:
        for q in queries:
            hybrid_cand = HybridSearchService.search_hybrid(
                db=db,
                project_id=project_id,
                query=q,
                top_k=5,
                alpha=0.65,
                source_type=target_source_type,
                uploaded_log_id=uploaded_log_id
            )
            reranked = RelevanceReranker.rerank(query=q, candidates=hybrid_cand, top_k=3)
            for r in reranked:
                cid = r["chunk_id"]
                if cid not in seen_chunk_ids:
                    seen_chunk_ids.add(cid)
                    cand = next((c for c in hybrid_cand if c["chunk_id"] == cid), None)
                    if cand:
                        all_candidates.append(cand)
                    else:
                        all_candidates.append(r)

    latency = (time.time() - start_time) * 1000.0
    input_payload = {"project_id": project_id, "search_queries": queries}
    output_payload = {"retrieved_chunks_count": len(all_candidates), "chunk_ids": list(seen_chunk_ids)}

    record_step(db, run_id, "retriever", input_payload, output_payload, latency)

    return {"retrieved_chunks": all_candidates}


def root_cause_analyzer_node(state: DebugAgentState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    start_time = time.time()
    db = get_db_from_config(config)
    run_id = state.get("agent_run_id", 0)
    chunks = state.get("retrieved_chunks", [])
    query = state.get("query", "")

    if not chunks:
        hypothesis = "Insufficient evidence retrieved in connected codebase."
    else:
        top_c = chunks[0]
        fp = top_c.get("file_path", "source code")
        sym = top_c.get("symbol_name")
        sym_str = f" for symbol '{sym}'" if sym else ""
        hypothesis = f"Evidence identified in {fp}{sym_str} matching query '{query}'."

    latency = (time.time() - start_time) * 1000.0
    input_payload = {"query": query, "chunks_count": len(chunks)}
    output_payload = {"root_cause_hypothesis": hypothesis}

    record_step(db, run_id, "root_cause_analyzer", input_payload, output_payload, latency)

    return {"root_cause_hypothesis": hypothesis}


def verifier_node(state: DebugAgentState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    start_time = time.time()
    db = get_db_from_config(config)
    run_id = state.get("agent_run_id", 0)
    hypothesis = state.get("root_cause_hypothesis", "")
    chunks = state.get("retrieved_chunks", [])
    iteration = state.get("iteration_count", 0)

    is_grounded = bool(chunks and "Insufficient" not in hypothesis)
    confidence = 0.85 if is_grounded else 0.30

    needs_retry = (not is_grounded or confidence < 0.50) and iteration < 1

    verification_result = {
        "is_grounded": is_grounded,
        "confidence": confidence,
        "needs_retry": needs_retry
    }

    latency = (time.time() - start_time) * 1000.0
    input_payload = {"hypothesis": hypothesis, "chunks_count": len(chunks), "iteration": iteration}
    output_payload = verification_result

    status_str = "retry" if needs_retry else "success"
    record_step(db, run_id, "verifier", input_payload, output_payload, latency, status=status_str)

    # Increment iteration count if retrying
    new_iteration = iteration + 1 if needs_retry else iteration

    return {
        "verification_result": verification_result,
        "iteration_count": new_iteration
    }


def report_writer_node(state: DebugAgentState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    start_time = time.time()
    db = get_db_from_config(config)
    run_id = state.get("agent_run_id", 0)
    project_id = state.get("project_id", 0)
    log_id = state.get("uploaded_log_id")
    query = state.get("query", "")
    retrieved_chunks = state.get("retrieved_chunks", [])

    final_report_id = None
    if db:
        report = RAGDebugReportService.generate_report(
            db=db,
            project_id=project_id,
            uploaded_log_id=log_id,
            user_query=query,
            top_k=5,
            pre_retrieved_chunks=retrieved_chunks if retrieved_chunks else None
        )
        final_report_id = report.id

    latency = (time.time() - start_time) * 1000.0
    input_payload = {"project_id": project_id, "uploaded_log_id": log_id, "query": query}
    output_payload = {"final_report_id": final_report_id}

    record_step(db, run_id, "report_writer", input_payload, output_payload, latency)

    return {"final_report_id": final_report_id}
