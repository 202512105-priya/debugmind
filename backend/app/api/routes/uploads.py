from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.uploaded_log import UploadedLog
from app.models.project import Project
from app.schemas.uploaded_log import UploadedLogCreate, UploadedLogRead

router = APIRouter()

@router.post("/logs", response_model=UploadedLogRead, status_code=status.HTTP_201_CREATED)
def upload_log(log_in: UploadedLogCreate, db: Session = Depends(get_db)):
    # Check if project exists
    project = db.query(Project).filter(Project.id == log_in.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {log_in.project_id} not found"
        )
        
    db_log = UploadedLog(
        project_id=log_in.project_id,
        filename=log_in.filename,
        raw_content=log_in.raw_content,
        source_type=log_in.source_type
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/logs/{log_id}", response_model=UploadedLogRead)
def get_log(log_id: int, db: Session = Depends(get_db)):
    db_log = db.query(UploadedLog).filter(UploadedLog.id == log_id).first()
    if not db_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Uploaded log with ID {log_id} not found"
        )
    return db_log
