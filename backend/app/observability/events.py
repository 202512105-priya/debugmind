import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.system_event import SystemEvent
from app.observability.logging import get_logger

logger = get_logger("debugmind.events")

def log_system_event(
    db: Session,
    event_type: str,
    project_id: Optional[int] = None,
    user_id: Optional[int] = None,
    payload: Optional[Dict[str, Any]] = None
) -> SystemEvent:
    payload_str = json.dumps(payload) if payload else None
    event = SystemEvent(
        event_type=event_type,
        project_id=project_id,
        user_id=user_id,
        payload_json=payload_str
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    extra = {
        "event": event_type,
        "project_id": project_id,
        "payload": payload
    }
    logger.info(f"System event logged: {event_type}", extra=extra)
    return event
