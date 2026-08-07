from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import redis
from app.db.session import get_db
from app.core.config import settings

router = APIRouter()

@router.get("", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    postgres_status = "ok"
    redis_status = "ok"
    
    # Check Postgres
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        postgres_status = f"error: {str(e)}"
        
    # Check Redis
    try:
        r = redis.from_url(settings.REDIS_URL, socket_timeout=2)
        r.ping()
    except Exception as e:
        redis_status = f"error: {str(e)}"
        
    status = "ok"
    if postgres_status != "ok" or redis_status != "ok":
        status = "error"
        
    return {
        "status": status,
        "postgres": postgres_status,
        "redis": redis_status
    }
