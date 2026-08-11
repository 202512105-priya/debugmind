import pytest
from app.evals.metrics import (
    calculate_recall_at_k,
    calculate_precision_at_k,
    check_format_validity,
    check_hallucination_rules,
)
from app.evals.judge import LLMJudgeEvaluator

def test_recall_and_precision_at_k():
    expected = ["app/auth/middleware.py", "tests/conftest.py"]
    retrieved = [
        "app/auth/middleware.py",
        "README.md",
        "tests/test_auth.py",
        "settings.py",
        "routes/login.py"
    ]

    recall = calculate_recall_at_k(expected, retrieved, k=5)
    assert recall == 0.5  # 1 out of 2 expected found in top 5

    precision = calculate_precision_at_k(expected, retrieved, k=5)
    assert precision == 0.2  # 1 out of 5 retrieved is relevant

def test_format_validity():
    valid_report = {
        "failure_type": "test_failure",
        "summary": "Login 401 unauthorized",
        "likely_root_cause": "Missing token header",
        "suggested_fix": "Add Authorization token header",
        "confidence": 0.9,
        "missing_information": [],
        "evidence": [
            {
                "chunk_id": 1,
                "file_path": "app/auth/middleware.py",
                "start_line": 1,
                "end_line": 10,
                "reason": "Token validation check"
            }
        ]
    }
    assert check_format_validity(valid_report) is True

    invalid_report = {
        "failure_type": "invalid_type_name",
        "confidence": "high"
    }
    assert check_format_validity(invalid_report) is False

def test_hallucination_rules():
    report = {
        "evidence": [
            {"file_path": "app/auth/middleware.py", "reason": "auth check"}
        ]
    }
    retrieved_chunks = [
        {"file_path": "app/auth/middleware.py", "content": "def check(): pass"}
    ]

    res = check_hallucination_rules(report, retrieved_chunks)
    assert res["has_hallucination"] is False
    assert res["hallucination_score"] == 1.0

def test_llm_judge_evaluator():
    case = {
        "expected_failure_type": "test_failure",
        "expected_root_cause": "Missing tenant_id header in request",
        "expected_fix_keywords": ["tenant_id", "header"]
    }
    report = {
        "failure_type": "test_failure",
        "summary": "Test login failed with 401 missing tenant_id header",
        "likely_root_cause": "Missing tenant_id header in request fixture",
        "suggested_fix": "Add tenant_id header to request fixture",
        "confidence": 0.9,
        "evidence": [{"file_path": "app/auth/middleware.py"}]
    }
    retrieved = [{"file_path": "app/auth/middleware.py"}]

    judge_res = LLMJudgeEvaluator.evaluate_report(case, report, retrieved)
    assert judge_res.root_cause_score >= 4.0
    assert judge_res.groundedness_score >= 4.0
    assert judge_res.fix_relevance_score >= 4.0
    assert judge_res.hallucination_score <= 1.5
