# DebugMind Evaluation Benchmark Report

- **Run Name**: `debugmind-v1-baseline`
- **Eval Run ID**: 1
- **Dataset ID**: 1 (`DebugMind Golden Baseline v1.0`)
- **Status**: `COMPLETED`

---

## 📈 Aggregated Performance Metrics

| Metric | Score / Rate | Benchmark Target | Description |
| :--- | :--- | :--- | :--- |
| **Cases Evaluated** | `5` | 5+ cases | Number of golden test cases evaluated |
| **Retrieval Recall@5** | `100.0%` | $\ge 80\%$ | Relevant files retrieved in top 5 chunks |
| **Retrieval Precision@5** | `100.0%` | $\ge 50\%$ | Fraction of top 5 chunks that are relevant |
| **Root Cause Score** | `5.00 / 5.0` | $\ge 4.0 / 5.0$ | LLM Judge score for root cause hypothesis |
| **Groundedness Score** | `4.50 / 5.0` | $\ge 4.0 / 5.0$ | LLM Judge score for evidence grounding |
| **Fix Relevance Score** | `4.73 / 5.0` | $\ge 4.0 / 5.0$ | Relevance of proposed code fix |
| **Hallucination Risk** | `1.00 / 5.0` | $\le 1.5 / 5.0$ | Hallucination rate (1.0 = zero hallucination) |
| **Format Validity Rate** | `100.0%` | $100\%$ | Pydantic schema validation compliance |
| **Avg Latency per Case** | `4.7 ms` | $< 2000\text{ ms}$ | Average time to generate report |
| **Avg Cost per Case** | `$0.0080` | $< \$0.02$ | Estimated LLM token cost in USD |

---

## 🔍 Key Benchmark Findings

1. **Retrieval Precision**: Multi-stage hybrid search ($\text{pgvector} + \text{BM25}$) accurately retrieved relevant files for all failure scenarios.
2. **Citation Grounding**: Verified that all evidence citations in generated debug reports correspond strictly to valid code chunks without hallucinations.
3. **Format Compliance**: Pydantic schema validation maintained 100% compliance across all outputs.
