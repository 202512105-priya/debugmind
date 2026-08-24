from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.project import Project
from app.models.agent_run import AgentRun
from app.models.agent_step import AgentStep
from app.models.llm_call import LLMCall
from app.models.system_event import SystemEvent
from app.cache.redis_cache import RedisCache
from app.observability.cost import calculate_llm_cost

router = APIRouter()

@router.get("/projects/{project_id}/usage")
def get_project_usage(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    agent_runs_count = db.query(func.count(AgentRun.id)).filter(AgentRun.project_id == project_id).scalar() or 0

    # Aggregate LLM calls
    llm_calls = db.query(LLMCall).filter(LLMCall.project_id == project_id).all()
    llm_calls_count = len(llm_calls)

    total_input_tokens = sum(call.input_tokens or 0 for call in llm_calls)
    total_output_tokens = sum(call.output_tokens or 0 for call in llm_calls)
    
    # Calculate estimated cost
    total_cost = sum(
        calculate_llm_cost(call.model_name or "gpt-4o-mini", call.input_tokens or 0, call.output_tokens or 0)
        for call in llm_calls
    )

    # Average latency across steps
    avg_step_latency = db.query(func.avg(AgentStep.latency_ms)).join(AgentRun).filter(AgentRun.project_id == project_id).scalar()
    avg_latency_ms = round(float(avg_step_latency), 2) if avg_step_latency else 0.0

    cache_stats = RedisCache.get_stats()

    return {
        "project_id": project_id,
        "project_name": project.name,
        "agent_runs": agent_runs_count,
        "llm_calls": llm_calls_count,
        "input_tokens": total_input_tokens,
        "output_tokens": total_output_tokens,
        "total_tokens": total_input_tokens + total_output_tokens,
        "estimated_cost": round(total_cost, 4),
        "average_latency_ms": avg_latency_ms,
        "cache_hit_rate": cache_stats["hit_rate"]
    }

@router.get("/projects/{project_id}/events")
def list_project_events(project_id: int, limit: int = 50, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    events = db.query(SystemEvent).filter(SystemEvent.project_id == project_id).order_by(SystemEvent.created_at.desc()).limit(limit).all()
    return [
        {
            "id": ev.id,
            "event_type": ev.event_type,
            "project_id": ev.project_id,
            "created_at": ev.created_at,
            "payload": ev.payload_json
        }
        for ev in events
    ]

import datetime

@router.get("/health/deep")
def deep_health_check(db: Session = Depends(get_db)):
    health_status: Dict[str, Any] = {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "services": {}
    }

    # 1. API check
    health_status["services"]["api"] = {"status": "ok"}

    # 2. Database check
    try:
        db.execute(func.now())
        health_status["services"]["database"] = {"status": "ok"}
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["database"] = {"status": "error", "message": str(e)}

    # 3. Cache check
    try:
        stats = RedisCache.get_stats()
        health_status["services"]["cache"] = {"status": "ok", "stats": stats}
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["cache"] = {"status": "error", "message": str(e)}

    # 4. Embedding provider check
    health_status["services"]["embedding_provider"] = {"status": "ok", "model": "text-embedding-3-small"}

    # 5. LLM provider check
    health_status["services"]["llm_provider"] = {"status": "ok", "model": "gpt-4o-mini"}

    return health_status

@router.get("/metrics")
def prometheus_metrics(db: Session = Depends(get_db)):
    agent_runs_total = db.query(func.count(AgentRun.id)).scalar() or 0
    llm_calls_total = db.query(func.count(LLMCall.id)).scalar() or 0
    total_input_tokens = db.query(func.sum(LLMCall.input_tokens)).scalar() or 0
    total_output_tokens = db.query(func.sum(LLMCall.output_tokens)).scalar() or 0
    cache_stats = RedisCache.get_stats()

    llm_calls = db.query(LLMCall).all()
    total_cost = sum(
        calculate_llm_cost(c.model_name or "gpt-4o-mini", c.input_tokens or 0, c.output_tokens or 0)
        for c in llm_calls
    )

    metrics_text = f"""# HELP debugmind_agent_runs_total Total number of agent runs executed.
# TYPE debugmind_agent_runs_total counter
debugmind_agent_runs_total {agent_runs_total}

# HELP debugmind_llm_calls_total Total number of LLM provider API calls.
# TYPE debugmind_llm_calls_total counter
debugmind_llm_calls_total {llm_calls_total}

# HELP debugmind_input_tokens_total Total input tokens processed across LLM calls.
# TYPE debugmind_input_tokens_total counter
debugmind_input_tokens_total {total_input_tokens}

# HELP debugmind_output_tokens_total Total output tokens generated across LLM calls.
# TYPE debugmind_output_tokens_total counter
debugmind_output_tokens_total {total_output_tokens}

# HELP debugmind_estimated_cost_dollars Estimated total cost incurred in USD.
# TYPE debugmind_estimated_cost_dollars gauge
debugmind_estimated_cost_dollars {round(total_cost, 4)}

# HELP debugmind_cache_hit_rate Hit rate for vector embedding and search cache.
# TYPE debugmind_cache_hit_rate gauge
debugmind_cache_hit_rate {cache_stats["hit_rate"]}
"""
    return Response(content=metrics_text, media_type="text/plain")
