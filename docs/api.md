# DebugMind REST API Documentation

Base URL: `http://localhost:8000` (Local) / `https://debugmind-api.onrender.com` (Render Production)

---

## 📌 Endpoint Summary Table

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/health` | Liveness check |
| | `GET` | `/health/deep` | Deep health check (DB, Redis, Embeddings, LLM) |
| **Projects** | `GET` | `/projects` | List all workspace projects |
| | `POST` | `/projects` | Create new workspace project |
| | `GET` | `/projects/{id}` | Get project by ID |
| **Repositories** | `POST` | `/projects/{id}/repositories` | Connect GitHub repo or local folder |
| | `GET` | `/projects/{id}/repositories` | List project repositories |
| | `POST` | `/repositories/{id}/ingest` | Scan & ingest source code files |
| | `POST` | `/repositories/{id}/chunk` | Run AST symbol chunking |
| | `POST` | `/repositories/{id}/files` | Add individual source code file |
| **CI Logs** | `POST` | `/projects/{id}/logs` | Upload raw CI build or test log |
| | `GET` | `/projects/{id}/logs` | List uploaded CI logs |
| | `POST` | `/logs/{id}/parse` | Extract pytest events & stack traces |
| **Search** | `POST` | `/projects/{id}/embeddings/index` | Build vector embeddings in `pgvector` |
| | `POST` | `/search/hybrid` | Execute hybrid vector + BM25 search |
| | `POST` | `/search/rerank` | Execute relevance score reranking |
| **Reports** | `POST` | `/debug-reports` | Generate grounded RAG debug report |
| | `GET` | `/projects/{id}/debug-reports` | List project debug reports |
| | `GET` | `/debug-reports/{id}` | Get report by ID |
| **Agent Runs**| `POST` | `/agent-runs` | Execute LangGraph multi-step agent workflow |
| | `GET` | `/agent-runs/{id}` | Get agent run status |
| | `GET` | `/agent-runs/{id}/steps` | List agent execution trace steps |
| **Evaluations**| `POST` | `/eval-datasets/seed` | Seed golden dataset v1 |
| | `POST` | `/eval-runs` | Execute evaluation run |
| | `GET` | `/eval-runs/{id}/summary` | Get aggregated evaluation metrics |
| **Observability**| `GET` | `/projects/{id}/usage` | Get token usage & cost analytics |
| | `GET` | `/projects/{id}/events` | List system audit events |
| | `GET` | `/metrics` | Prometheus-formatted text metrics |
