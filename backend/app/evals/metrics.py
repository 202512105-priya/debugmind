import os
from typing import List, Dict, Any
from app.schemas.debug_report import DebugReportOutput

def _normalize_path(path: str) -> str:
    if not path:
        return ""
    p = path.replace("\\", "/").strip().lower()
    # Strip leading slash or dot slash
    if p.startswith("./"):
        p = p[2:]
    if p.startswith("/"):
        p = p[1:]
    return p

def _path_matches(expected: str, retrieved: str) -> bool:
    norm_exp = _normalize_path(expected)
    norm_ret = _normalize_path(retrieved)
    if norm_exp == norm_ret:
        return True
    if norm_exp.endswith(norm_ret) or norm_ret.endswith(norm_exp):
        return True
    return False

def calculate_recall_at_k(expected_files: List[str], retrieved_files: List[str], k: int = 5) -> float:
    if not expected_files:
        return 1.0
    top_k = retrieved_files[:k]
    matched = 0
    for exp in expected_files:
        for ret in top_k:
            if _path_matches(exp, ret):
                matched += 1
                break
    return round(matched / len(expected_files), 4)

def calculate_precision_at_k(expected_files: List[str], retrieved_files: List[str], k: int = 5) -> float:
    if k <= 0:
        return 0.0
    top_k = retrieved_files[:k]
    if not top_k:
        return 0.0
    matched = 0
    for ret in top_k:
        for exp in expected_files:
            if _path_matches(exp, ret):
                matched += 1
                break
    return round(matched / len(top_k), 4)

def check_format_validity(raw_output: Dict[str, Any]) -> bool:
    try:
        DebugReportOutput.model_validate(raw_output)
        return True
    except Exception:
        return False

def check_hallucination_rules(report_output: Dict[str, Any], retrieved_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    retrieved_paths = set(_normalize_path(c.get("file_path", "")) for c in retrieved_chunks if c.get("file_path"))
    unsupported_citations = []

    citations = report_output.get("evidence", [])
    for cite in citations:
        cite_file = cite.get("file_path") or ""
        norm_cite = _normalize_path(cite_file)
        if norm_cite and not any(_path_matches(norm_cite, ret) for ret in retrieved_paths):
            unsupported_citations.append(cite_file)

    has_hallucination = len(unsupported_citations) > 0
    # Risk score: 1.0 (no hallucination) to 5.0 (high hallucination)
    risk_score = 1.0 if not has_hallucination else min(5.0, 1.0 + (len(unsupported_citations) * 1.5))

    return {
        "has_hallucination": has_hallucination,
        "hallucination_score": round(risk_score, 2),
        "unsupported_citations": unsupported_citations,
    }
