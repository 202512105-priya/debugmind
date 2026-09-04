from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.models.repository import Repository
from app.models.uploaded_log import UploadedLog
from app.models.chunk import Chunk
from app.models.chunk_embedding import ChunkEmbedding
from app.schemas.project import ProjectCreate, ProjectRead
from app.schemas.repository import RepositoryCreate, RepositoryRead
from app.schemas.uploaded_log import UploadedLogBase, UploadedLogRead
from app.services.embeddings import EmbeddingService
from app.core.config import settings

router = APIRouter()

def ensure_user_exists(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Create a placeholder user to satisfy foreign key constraint
        user = User(
            id=user_id,
            email=f"user_{user_id}@example.com",
            hashed_password="placeholder_hash",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    # Ensure owner exists
    ensure_user_exists(db, project_in.owner_id)
    
    project = Project(
        name=project_in.name,
        description=project_in.description,
        owner_id=project_in.owner_id
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("", response_model=List[ProjectRead])
def list_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    projects = db.query(Project).offset(skip).limit(limit).all()
    return projects

@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    return project

# --- Phase 1 Repositories ---

@router.post("/{project_id}/repositories", response_model=RepositoryRead, status_code=status.HTTP_201_CREATED)
def create_repository(project_id: int, repo_in: RepositoryCreate, db: Session = Depends(get_db)):
    # Check if project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    db_repo = Repository(
        project_id=project_id,
        name=repo_in.name,
        source_type=repo_in.source_type,
        root_path=repo_in.root_path,
        clone_url=repo_in.clone_url
    )
    db.add(db_repo)
    db.commit()
    db.refresh(db_repo)

    # Automatically scan, ingest, chunk & embed if root_path provided
    from app.services.ingestion import RepositoryIngestionService
    if repo_in.root_path:
        try:
            RepositoryIngestionService.scan_and_ingest(db, db_repo.id, repo_in.root_path)
            db.refresh(db_repo)
            from app.api.routes.repositories import chunk_repository
            chunk_repository(db_repo.id, db)
            db_repo.status = "completed"
            db.add(db_repo)
            db.commit()
            db.refresh(db_repo)
        except Exception as e:
            print(f"Warning: Automatic ingestion for repo {db_repo.id} failed: {e}")
            db.rollback()
            db_repo = db.query(Repository).filter(Repository.id == db_repo.id).first()

    return db_repo

@router.get("/{project_id}/repositories", response_model=List[RepositoryRead])
def list_repositories(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    return project.repositories

# --- Phase 1 Logs ---

@router.post("/{project_id}/logs", response_model=UploadedLogRead, status_code=status.HTTP_201_CREATED)
def create_log(project_id: int, log_in: UploadedLogBase, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    db_log = UploadedLog(
        project_id=project_id,
        filename=log_in.filename,
        raw_content=log_in.raw_content,
        source_type=log_in.source_type
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)

    # Auto parse and auto chunk log
    try:
        from app.services.parser import LogParserService
        from app.services.chunkers import LogChunker
        from app.models.parsed_log_event import ParsedLogEvent
        from app.models.file_reference import FileReference
        import json

        events = LogParserService.parse_log(db_log.raw_content)
        for evt_data in events:
            db_evt = ParsedLogEvent(
                uploaded_log_id=db_log.id,
                event_type=evt_data["event_type"],
                test_name=evt_data["test_name"],
                error_type=evt_data["error_type"],
                error_message=evt_data["error_message"],
                raw_block=evt_data["raw_block"]
            )
            db.add(db_evt)
            db.flush()
            for ref_data in evt_data["file_references"]:
                db_ref = FileReference(
                    parsed_log_event_id=db_evt.id,
                    file_path=ref_data["file_path"],
                    line_number=ref_data["line_number"],
                    function_name=ref_data["function_name"]
                )
                db.add(db_ref)

        raw_chunks = LogChunker.chunk(db_log.raw_content, db_log.id)
        for rc in raw_chunks:
            db_chunk = Chunk(
                project_id=project_id,
                uploaded_log_id=db_log.id,
                source_type="log",
                chunk_type=rc["chunk_type"],
                symbol_name=rc["symbol_name"],
                test_name=rc["test_name"],
                error_type=rc["error_type"],
                start_line=rc["start_line"],
                end_line=rc["end_line"],
                content=rc["content"],
                content_hash=rc["content_hash"],
                token_count=rc["token_count"],
                metadata_json=json.dumps(rc["metadata"]) if rc["metadata"] else None
            )
            db.add(db_chunk)
        db.commit()
    except Exception as e:
        print(f"Warning: Auto-parse/chunk failed on log upload: {e}")

    return db_log

@router.get("/{project_id}/logs", response_model=List[UploadedLogRead])
def list_logs(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    return project.uploaded_logs

# --- Phase 3 Embeddings / Indexing ---

@router.post("/{project_id}/embeddings/index", status_code=status.HTTP_200_OK)
def index_project_embeddings(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    # 1. Find all chunks for this project
    chunks = db.query(Chunk).filter(Chunk.project_id == project_id).all()
    if not chunks:
        return {
            "status": "success",
            "message": "No chunks found to index for this project",
            "chunks_indexed": 0
        }

    # 2. Find which chunk IDs already have embeddings for this model
    embedded_ids = {
        row[0] for row in db.query(ChunkEmbedding.chunk_id).filter(
            ChunkEmbedding.project_id == project_id,
            ChunkEmbedding.embedding_model == settings.EMBEDDING_MODEL
        ).all()
    }

    # 3. Filter chunks that need indexing
    chunks_to_index = [c for c in chunks if c.id not in embedded_ids]
    if not chunks_to_index:
        return {
            "status": "success",
            "message": "All chunks are already indexed for the current model",
            "chunks_indexed": 0
        }

    # 4. Batch embed and save (Batch size: 32)
    batch_size = 32
    chunks_indexed = 0

    for i in range(0, len(chunks_to_index), batch_size):
        batch = chunks_to_index[i : i + batch_size]
        texts = [c.content for c in batch]
        
        try:
            vectors = EmbeddingService.get_embeddings(texts)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate embeddings: {str(e)}"
            )

        for chunk, vector in zip(batch, vectors):
            db_emb = ChunkEmbedding(
                chunk_id=chunk.id,
                project_id=project_id,
                embedding_model=settings.EMBEDDING_MODEL,
                embedding_dimension=settings.EMBEDDING_DIMENSION,
                embedding=vector
            )
            db.add(db_emb)
            chunks_indexed += 1

        db.commit()

    return {
        "status": "success",
        "message": f"Successfully generated and stored embeddings for {chunks_indexed} chunks",
        "chunks_indexed": chunks_indexed
    }
