from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.db.base
from app.api.routes import health, projects, uploads, repositories, code_files, logs, chunks, search, debug_reports, agent_runs, evals, observability
from app.db.session import init_db

app = FastAPI(
    title="DebugMind API",
    description="DebugMind AI-powered code analysis and log debugging backend",
    version="0.1.0"
)

import threading

@app.on_event("startup")
def on_startup():
    def _async_init():
        try:
            init_db()
        except Exception as e:
            print(f"Database init note: {e}")
    threading.Thread(target=_async_init, daemon=True).start()

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://debugmind-dashboard.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=0,
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
app.include_router(observability.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
