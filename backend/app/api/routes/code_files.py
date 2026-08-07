from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.code_file import CodeFile
from app.schemas.code_file import CodeFileRead

router = APIRouter()

@router.get("/{file_id}", response_model=CodeFileRead)
def get_code_file(file_id: int, db: Session = Depends(get_db)):
    code_file = db.query(CodeFile).filter(CodeFile.id == file_id).first()
    if not code_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Code file with ID {file_id} not found"
        )
    return code_file
