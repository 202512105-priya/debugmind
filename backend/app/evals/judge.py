from typing import Dict, Any, List
from app.evals.schemas import JudgeRubricOutput
from app.evals.metrics import check_hallucination_rules

class LLMJudgeEvaluator:

    @classmethod
    def evaluate_report(
        cls,
        case: Dict[str, Any],
        report: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> JudgeRubricOutput:
        expected_root_cause = case.get("expected_root_cause", "").lower()
        expected_keywords = [k.lower() for k in case.get("expected_fix_keywords", [])]
        expected_failure_type = case.get("expected_failure_type", "unknown")

        actual_summary = report.get("summary", "").lower()
        actual_root_cause = report.get("likely_root_cause", "").lower()
        actual_fix = report.get("suggested_fix", "").lower()
        actual_failure_type = report.get("failure_type", "unknown")

        # 1. Root Cause Score (1.0 - 5.0)
        rc_score = 3.0
        if actual_failure_type == expected_failure_type:
            rc_score += 0.5
        
        # Check semantic or keyword match with expected root cause
        exp_tokens = set(expected_root_cause.split())
        act_tokens = set((actual_root_cause + " " + actual_summary).split())
        overlap = len(exp_tokens.intersection(act_tokens))
        if len(exp_tokens) > 0 and (overlap / len(exp_tokens)) > 0.25:
            rc_score += 1.5
        elif any(k in actual_root_cause or k in actual_summary for k in expected_keywords):
            rc_score += 1.0

        rc_score = min(5.0, max(1.0, round(rc_score, 2)))

        # 2. Fix Relevance Score (1.0 - 5.0)
        fix_score = 3.0
        kw_matches = sum(1 for kw in expected_keywords if kw in actual_fix or kw in actual_root_cause)
        if expected_keywords:
            kw_ratio = kw_matches / len(expected_keywords)
            fix_score += kw_ratio * 2.0
        else:
            fix_score += 1.0

        fix_score = min(5.0, max(1.0, round(fix_score, 2)))

        # 3. Groundedness Score (1.0 - 5.0)
        groundedness = 3.5
        citations = report.get("evidence", [])
        if citations and len(retrieved_chunks) > 0:
            groundedness += 1.0
        elif len(retrieved_chunks) > 0:
            groundedness += 0.5

        groundedness = min(5.0, max(1.0, round(groundedness, 2)))

        # 4. Hallucination Score (1.0 = low hallucination, 5.0 = high hallucination)
        hall_rules = check_hallucination_rules(report, retrieved_chunks)
        hall_score = hall_rules["hallucination_score"]

        return JudgeRubricOutput(
            root_cause_score=rc_score,
            groundedness_score=groundedness,
            fix_relevance_score=fix_score,
            hallucination_score=hall_score,
            explanation=f"Evaluated failure_type={actual_failure_type}, root_cause_overlap={overlap}, kw_matches={kw_matches}"
        )
