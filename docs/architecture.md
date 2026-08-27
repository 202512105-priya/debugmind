# DebugMind Architecture Specification

DebugMind is an autonomous **AI Reliability Engineering Platform** designed to analyze failed CI logs, inspect codebases, execute bounded multi-step agent workflows, and generate grounded RAG debug reports.

---

## 🏗️ High-Level System Architecture

```text
               ┌──────────────────────────────────────────────┐
               │    React + TypeScript Developer Dashboard    │
               └──────────────────────┬───────────────────────┘
                                      │ REST API / CORS
                                      ▼
               ┌──────────────────────────────────────────────┐
               │            FastAPI Backend Engine            │
               └──────┬───────────────┬──────────────┬────────┘
                      │               │              │
       ┌──────────────┴────┐  ┌───────┴──────┐  ┌────┴─────────────┐
       │ Ingestion Service │  │ Hybrid RAG   │  │ LangGraph Agent  │
       │ & AST Chunkers    │  │ Search Engine│  │ State Machine    │
       └──────────────┬────┘  └───────┬──────┘  └────┬─────────────┘
                      │               │              │
                      ▼               ▼              ▼
       ┌───────────────────────────────────────────────────────────┐
       │             PostgreSQL 17 Database + pgvector             │
       │     (Projects, Repos, CodeFiles, Chunks, Embeddings,      │
       │     DebugReports, AgentRuns, SystemEvents, Evals)         │
       └───────────────────────────────────────────────────────────┘
```

---

## 🧩 Core Architectural Components

### 1. Repository Ingestion & Language-Aware AST Chunkers
- **GitHub Repository Cloning**: Clones GitHub repositories directly (`git clone --depth 1`) or scans local workspace folder paths.
- **AST Chunkers**:
  - `PythonChunker`: Extracts function (`def`) and class (`class`) definitions with line numbers.
  - `JSTSChunker`: Parses JavaScript and TypeScript ES6 modules, React components, and interfaces.
  - `MarkdownChunker`: Splits sections by Markdown headers (`#`, `##`, `###`).
  - `LogChunker`: Parses pytest failure blocks and stack traces.

### 2. Multi-Stage Hybrid RAG Search Engine
Combines two search strategies for maximum retrieval precision:
- **Dense Vector Search**: Powered by PostgreSQL `pgvector` cosine similarity embeddings (`text-embedding-3-small`).
- **Sparse Keyword Search**: BM25-style term frequency score matching over AST symbols.
- **Relevance Reranker**: Fuses vector distance and keyword scores to order evidence by exact code context match.

### 3. LangGraph Bounded Agent Workflow State Machine
Implemented using a 6-node state graph (`StateGraph`):
1. `classifier_node`: Categorizes failure into `test_failure`, `build_failure`, `runtime_error`, `dependency_error`, or `unknown`.
2. `query_planner_node`: Formulates targeted search queries.
3. `retriever_node`: Executes hybrid search & relevance reranking.
4. `root_cause_analyzer_node`: Formulates root cause hypothesis.
5. `verifier_node`: Evaluates whether the hypothesis is grounded in cited chunks (`is_grounded: bool`).
6. `report_writer_node`: Persists final grounded debug report.
7. **Conditional Retry Edge**: Automatically retries query planning if evidence grounding is weak ($is\_grounded = \text{False}$ and $iteration < 2$).

### 4. Production Observability & Security Layer
- **Structured JSON Logging**: Standardized JSON formatting (`timestamp`, `level`, `event`, `project_id`, `latency_ms`).
- **Token & Cost Tracking**: Calculates USD costs per LLM call and agent run.
- **Redis Cache**: Caches chunk embeddings and hybrid search results.
- **Secret Redaction**: Redacts sensitive credentials (`DATABASE_URL`, `OPENAI_API_KEY`, Bearer tokens) from raw logs.
- **Sliding-Window Rate Limiting**: Protects backend endpoints against abuse.
