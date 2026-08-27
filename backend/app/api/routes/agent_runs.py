import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.project import Project
from app.models.agent_run import AgentRun
from app.models.agent_step import AgentStep
from app.schemas.agent_run import AgentRunCreateRequest, AgentRunRead, AgentStepRead
from app.agents.debug_graph import debug_agent_graph

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/agent-runs", response_model=AgentRunRead, status_code=status.HTTP_201_CREATED)
def run_agent_workflow(req: AgentRunCreateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {req.project_id} not found"
        )

    # 1. Create AgentRun record
    run = AgentRun(
        project_id=req.project_id,
        uploaded_log_id=req.uploaded_log_id,
        query=req.query or "Analyze CI failure",
        status="running"
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # 2. Prepare initial State
    initial_state = {
        "project_id": req.project_id,
        "uploaded_log_id": req.uploaded_log_id,
        "query": req.query or "Analyze CI failure",
        "search_queries": [],
        "retrieved_chunks": [],
        "root_cause_hypothesis": None,
        "verification_result": {},
        "final_report_id": None,
        "iteration_count": 0,
        "agent_run_id": run.id
    }

    config = {
        "configurable": {
            "db": db
        }
    }

    # 3. Execute LangGraph Workflow
    try:
        final_state = debug_agent_graph.invoke(initial_state, config=config)
        print("\n=== FINAL STATE ===", final_state)
        
        run.status = "completed"
        run.failure_type = final_state.get("failure_type")
        run.final_report_id = final_state.get("final_report_id")
        run.completed_at = datetime.datetime.now(datetime.timezone.utc)
        db.add(run)
        db.commit()
        db.refresh(run)
    except Exception as e:
        logger.error(f"Agent run {run.id} failed: {e}")
        run.status = "failed"
        run.error_message = str(e)
        run.completed_at = datetime.datetime.now(datetime.timezone.utc)
        db.add(run)
        db.commit()
        db.refresh(run)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent workflow execution failed: {str(e)}"
        )

    return run

@router.get("/agent-runs/{agent_run_id}", response_model=AgentRunRead)
def get_agent_run(agent_run_id: int, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == agent_run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run with ID {agent_run_id} not found"
        )
    return run

@router.get("/agent-runs/{agent_run_id}/steps", response_model=List[AgentStepRead])
def list_agent_steps(agent_run_id: int, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == agent_run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent run with ID {agent_run_id} not found"
        )
    return run.steps

@router.get("/projects/{project_id}/agent-runs", response_model=List[AgentRunRead])
def list_project_agent_runs(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    return db.query(AgentRun).filter(AgentRun.project_id == project_id).order_by(AgentRun.id.desc()).all()
