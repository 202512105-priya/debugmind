from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.chunk import Chunk
from app.models.project import Project
from app.schemas.chunk import ChunkRead

router = APIRouter()

@router.get("/projects/{project_id}/chunks", response_model=List[ChunkRead])
def list_project_chunks(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
        
    chunks = db.query(Chunk).filter(Chunk.project_id == project_id).all()
    return chunks

@router.get("/chunks/{chunk_id}", response_model=ChunkRead)
def get_chunk(chunk_id: int, db: Session = Depends(get_db)):
    chunk = db.query(Chunk).filter(Chunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chunk with ID {chunk_id} not found"
        )
    return chunk
