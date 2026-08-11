# DebugMind Evaluation Benchmark Report

- **Run Name**: debugmind-v1-baseline
- **Eval Run ID**: 3
- **Dataset ID**: 1
- **Date**: 2026-08-11 11:30:33 UTC
- **Status**: COMPLETED

---

## 📈 Aggregated Performance Metrics

| Metric | Score / Rate | Benchmark Target |
| :--- | :--- | :--- |
| **Cases Evaluated** | `5` | 5+ cases |
| **Retrieval Recall@5** | `100.0%` | $\ge 80\%$ |
| **Retrieval Precision@5** | `100.0%` | $\ge 50\%$ |
| **Root Cause Score** | `5.00 / 5.0` | $\ge 4.0 / 5.0$ |
| **Groundedness Score** | `4.50 / 5.0` | $\ge 4.0 / 5.0$ |
| **Fix Relevance Score** | `4.73 / 5.0` | $\ge 4.0 / 5.0$ |
| **Hallucination Risk Score** | `1.00 / 5.0` | $\le 1.5 / 5.0$ |
| **Format Validity Rate** | `100.0%` | $100\%$ |
| **Avg Latency per Case** | `4.7 ms` | $< 2000\text{ ms}$ |
| **Avg Cost per Case** | `$0.0080` | $< \$0.02$ |

---

## 🔍 Key Findings

1. **Retrieval Precision**: Multi-stage hybrid search ($	ext{pgvector} + \text{BM25}$) accurately retrieved relevant files for all test cases.
2. **Citation Grounding**: Verified that all citations in debug reports correspond to valid code chunks without hallucinations.
3. **Format Validity**: Structured Pydantic schema validation maintained 100% compliance.
