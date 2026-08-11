import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.eval_dataset import EvalDataset
from app.models.eval_case import EvalCase
from app.models.eval_run import EvalRun
from app.models.eval_result import EvalResult
from app.evals.schemas import (
    EvalDatasetRead,
    EvalRunCreate,
    EvalRunRead,
    EvalResultRead,
    EvalSummaryRead,
)
from app.evals.runner import EvaluationRunner

router = APIRouter()

SEED_GOLDEN_CASES = [
    {
        "case_id": "auth_401_missing_tenant",
        "project_name": "payments-api",
        "input_log": "FAILED tests/test_auth.py::test_login - 401 Unauthorized missing tenant_id header",
        "user_query": "Why is login returning 401 Unauthorized?",
        "expected_failure_type": "test_failure",
        "expected_root_cause": "Auth middleware requires tenant_id header but test fixture does not provide it.",
        "expected_relevant_files": ["app/auth/middleware.py", "tests/test_auth.py"],
        "expected_fix_keywords": ["tenant_id", "fixture", "header"]
    },
    {
        "case_id": "db_connection_refused",
        "project_name": "user-service",
        "input_log": "psycopg2.OperationalError: could not connect to server: Connection refused on port 5432",
        "user_query": "Why is database connection failing?",
        "expected_failure_type": "runtime_error",
        "expected_root_cause": "PostgreSQL database container is not running or DATABASE_URL hostname is invalid.",
        "expected_relevant_files": ["app/db/session.py", "docker-compose.yml"],
        "expected_fix_keywords": ["database_url", "postgres", "connection"]
    },
    {
        "case_id": "missing_env_secret_key",
        "project_name": "auth-service",
        "input_log": "KeyError: 'JWT_SECRET_KEY' in app/core/config.py line 14",
        "user_query": "Why is auth service failing to boot?",
        "expected_failure_type": "runtime_error",
        "expected_root_cause": "JWT_SECRET_KEY environment variable is not defined in .env environment configuration.",
        "expected_relevant_files": ["app/core/config.py", ".env.example"],
        "expected_fix_keywords": ["jwt_secret_key", "env", "config"]
    },
    {
        "case_id": "wrong_import_module_path",
        "project_name": "analytics-worker",
        "input_log": "ModuleNotFoundError: No module named 'app.utils.helpers'",
        "user_query": "Import error when running worker tasks",
        "expected_failure_type": "build_failure",
        "expected_root_cause": "Module 'app.utils.helpers' was moved or import path is incorrect.",
        "expected_relevant_files": ["app/worker.py", "app/utils/helpers.py"],
        "expected_fix_keywords": ["import", "module", "pythonpath"]
    },
    {
        "case_id": "dependency_version_mismatch",
        "project_name": "ml-gateway",
        "input_log": "AttributeError: 'Pydantic' object has no attribute 'BaseSettings'",
        "user_query": "Pydantic BaseSettings import error",
        "expected_failure_type": "dependency_error",
        "expected_root_cause": "Pydantic v2 moved BaseSettings to pydantic-settings library causing version incompatibility.",
        "expected_relevant_files": ["pyproject.toml", "app/core/config.py"],
        "expected_fix_keywords": ["pydantic-settings", "basesettings", "version"]
    }
]

@router.post("/eval-datasets/seed", response_model=EvalDatasetRead, status_code=status.HTTP_201_CREATED)
def seed_golden_dataset(db: Session = Depends(get_db)):
    dataset = db.query(EvalDataset).filter(EvalDataset.name == "DebugMind Golden Baseline", EvalDataset.version == "v1.0").first()
    if not dataset:
        dataset = EvalDataset(
            name="DebugMind Golden Baseline",
            version="v1.0",
            description="Golden dataset containing 5 synthetic CI log failure debugging cases."
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

    for case_data in SEED_GOLDEN_CASES:
        existing = db.query(EvalCase).filter(EvalCase.dataset_id == dataset.id, EvalCase.case_id == case_data["case_id"]).first()
        if not existing:
            eval_case = EvalCase(
                dataset_id=dataset.id,
                case_id=case_data["case_id"],
                project_name=case_data["project_name"],
                input_log=case_data["input_log"],
                user_query=case_data["user_query"],
                expected_failure_type=case_data["expected_failure_type"],
                expected_root_cause=case_data["expected_root_cause"],
                expected_relevant_files=json.dumps(case_data["expected_relevant_files"]),
                expected_fix_keywords=json.dumps(case_data["expected_fix_keywords"])
            )
            db.add(eval_case)

    db.commit()
    db.refresh(dataset)
    return dataset

@router.get("/eval-datasets", response_model=List[EvalDatasetRead])
def list_eval_datasets(db: Session = Depends(get_db)):
    return db.query(EvalDataset).all()

@router.post("/eval-runs", response_model=EvalRunRead, status_code=status.HTTP_201_CREATED)
def create_eval_run(run_in: EvalRunCreate, db: Session = Depends(get_db)):
    dataset = db.query(EvalDataset).filter(EvalDataset.id == run_in.dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EvalDataset with ID {run_in.dataset_id} not found"
        )

    eval_run = EvalRun(
        dataset_id=run_in.dataset_id,
        run_name=run_in.run_name,
        system_version=run_in.system_version or "v1.0",
        prompt_version=run_in.prompt_version or "v1.0",
        embedding_model=run_in.embedding_model or "text-embedding-3-small",
        reranker_version=run_in.reranker_version or "v1.0",
        status="running"
    )
    db.add(eval_run)
    db.commit()
    db.refresh(eval_run)

    # Execute evaluation synchronously or inline
    try:
        EvaluationRunner.run_evaluation(db, eval_run.id)
    except Exception as err:
        eval_run.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation run failed: {err}"
        )

    db.refresh(eval_run)
    return eval_run

@router.get("/eval-runs/{eval_run_id}", response_model=EvalRunRead)
def get_eval_run(eval_run_id: int, db: Session = Depends(get_db)):
    eval_run = db.query(EvalRun).filter(EvalRun.id == eval_run_id).first()
    if not eval_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EvalRun with ID {eval_run_id} not found"
        )
    return eval_run

@router.get("/eval-runs/{eval_run_id}/results", response_model=List[EvalResultRead])
def list_eval_results(eval_run_id: int, db: Session = Depends(get_db)):
    eval_run = db.query(EvalRun).filter(EvalRun.id == eval_run_id).first()
    if not eval_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"EvalRun with ID {eval_run_id} not found"
        )
    return eval_run.results

@router.get("/eval-runs/{eval_run_id}/summary", response_model=EvalSummaryRead)
def get_eval_summary(eval_run_id: int, db: Session = Depends(get_db)):
    try:
        return EvaluationRunner.get_summary(db, eval_run_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
