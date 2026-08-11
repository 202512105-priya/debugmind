from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.db.base
from app.api.routes import health, projects, uploads, repositories, code_files, logs, chunks, search, debug_reports, agent_runs, evals

app = FastAPI(
    title="DebugMind API",
    description="DebugMind AI-powered code analysis and log debugging backend",
    version="0.1.0"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix="/health")
app.include_router(projects.router, prefix="/projects")
app.include_router(uploads.router, prefix="/uploads")
app.include_router(repositories.router, prefix="/repositories")
app.include_router(code_files.router, prefix="/code-files")
app.include_router(logs.router, prefix="/logs")
app.include_router(chunks.router)
app.include_router(search.router, prefix="/search")
app.include_router(debug_reports.router)
app.include_router(agent_runs.router)
app.include_router(evals.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
