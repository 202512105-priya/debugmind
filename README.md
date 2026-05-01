# DebugMind - Phase 0

DebugMind is an AI-powered code analysis and log debugging backend. This is Phase 0, which establishes the core engineering foundation.

## Tech Stack
- **FastAPI**: Modern, high-performance web framework for Python.
- **SQLAlchemy (ORM)**: Database toolkit and ORM.
- **Alembic**: Database migrations.
- **PostgreSQL**: Primary SQL database.
- **Redis**: In-memory caching and health check integration.
- **Docker Compose**: Containerized execution.
- **Pytest**: Backend testing framework.

## Project Structure
```text
debugmind/
  backend/
    app/
      main.py
      core/
      api/
      models/
      schemas/
      services/
      db/
      tests/
    pyproject.toml
    Dockerfile
  docker-compose.yml
  README.md
  .env.example
```

## Running the Application

### Using Docker Compose (Recommended)
Build and spin up the containerized services:
```bash
docker compose up --build
```
This runs the FastAPI app, PostgreSQL database, and Redis cache, runs migrations automatically, and exposes the app at `http://localhost:8000`.

Open the interactive documentation at `http://localhost:8000/docs`.

### Running Tests
To run the tests inside the Docker container:
```bash
docker compose exec api pytest
```
To run tests locally:
```bash
cd backend
pip install -r requirements.txt
pytest
```
