from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from app.db.session import get_db
from app.models.repository import Repository
from app.models.code_file import CodeFile
from app.models.chunk import Chunk
from app.schemas.repository import RepositoryRead
from app.schemas.code_file import CodeFileRead, CodeFileCreate
from app.schemas.chunk import ChunkRead
from app.services.ingestion import RepositoryIngestionService
from app.services.chunkers import PythonChunker, MarkdownChunker, JSTSChunker

router = APIRouter()

@router.get("/{repository_id}", response_model=RepositoryRead)
def get_repository(repository_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repository_id} not found"
        )
    return repo

@router.post("/{repository_id}/ingest", status_code=status.HTTP_200_OK)
def ingest_repository(repository_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repository_id} not found"
        )
    
    if not repo.root_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repository has no root_path configured for ingestion"
        )

    try:
        count = RepositoryIngestionService.scan_and_ingest(db, repository_id, repo.root_path)
        return {
            "status": "success",
            "message": f"Successfully scanned and ingested {count} files",
            "files_ingested": count
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(e)}"
        )

@router.get("/{repository_id}/files", response_model=List[CodeFileRead])
def list_repository_files(repository_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repository_id} not found"
        )
    return repo.code_files

# --- Phase 2 Chunking ---

@router.post("/{repository_id}/chunk", status_code=status.HTTP_200_OK)
def chunk_repository(repository_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repository_id} not found"
        )

    # 1. Clear previous chunks for all code files in this repository
    file_ids = [f.id for f in repo.code_files]
    if file_ids:
        db.query(Chunk).filter(Chunk.code_file_id.in_(file_ids)).delete(synchronize_session=False)
        db.commit()

    # 2. Iterate and chunk
    chunks_created = 0
    seen_hashes = set()

    for file in repo.code_files:
        # Determine chunker based on language
        if file.language == "python":
            raw_chunks = PythonChunker.chunk(file.content, file.file_path)
        elif file.language == "markdown":
            raw_chunks = MarkdownChunker.chunk(file.content, file.file_path)
        elif file.language in ("javascript", "typescript", "typescript-react", "javascript-react"):
            raw_chunks = JSTSChunker.chunk(file.content, file.file_path)
        else:
            # Fallback to whole file chunk
            from app.services.chunkers import Chunker
            from app.services.token_estimator import estimate_token_count
            raw_chunks = [{
                "chunk_type": "file",
                "symbol_name": None,
                "start_line": 1,
                "end_line": len(file.content.splitlines()),
                "content": file.content,
                "content_hash": Chunker.get_hash(file.content),
                "token_count": estimate_token_count(file.content),
                "metadata": {}
            }]

        for rc in raw_chunks:
            h = rc["content_hash"]
            # Skip duplicates within this run or globally in this repository
            if h in seen_hashes:
                continue
            
            # Check DB to prevent duplicate chunk hashes globally in this repo
            exists = db.query(Chunk).filter(
                Chunk.repository_id == repository_id,
                Chunk.content_hash == h
            ).first()
            if exists:
                seen_hashes.add(h)
                continue

            seen_hashes.add(h)
            
            db_chunk = Chunk(
                project_id=repo.project_id,
                repository_id=repository_id,
                code_file_id=file.id,
                source_type="code",
                chunk_type=rc["chunk_type"],
                language=file.language,
                file_path=file.file_path,
                symbol_name=rc["symbol_name"],
                start_line=rc["start_line"],
                end_line=rc["end_line"],
                content=rc["content"],
                content_hash=h,
                token_count=rc["token_count"],
                metadata_json=json.dumps(rc["metadata"]) if rc["metadata"] else None
            )
            db.add(db_chunk)
            chunks_created += 1

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully chunked repository and created {chunks_created} chunks",
        "chunks_created": chunks_created
    }

@router.get("/{repository_id}/chunks", response_model=List[ChunkRead])
def list_repository_chunks(repository_id: int, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repository_id} not found"
        )
    
    chunks = db.query(Chunk).filter(Chunk.repository_id == repository_id).all()
    return chunks

@router.post("/{repository_id}/files", response_model=CodeFileRead, status_code=status.HTTP_201_CREATED)
def create_source_file(repository_id: int, file_in: CodeFileCreate, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repository_id} not found"
        )

    # Detect language
    lang = file_in.language
    if not lang:
        path_lower = file_in.file_path.lower()
        if path_lower.endswith(".py"):
            lang = "python"
        elif path_lower.endswith((".js", ".jsx")):
            lang = "javascript"
        elif path_lower.endswith((".ts", ".tsx")):
            lang = "typescript"
        elif path_lower.endswith(".md"):
            lang = "markdown"
        else:
            lang = "python"  # default to python if unspecified

    from app.services.chunkers import Chunker, PythonChunker, MarkdownChunker, JSTSChunker
    from app.services.token_estimator import estimate_token_count

    content_hash = Chunker.get_hash(file_in.content)
    line_count = len(file_in.content.splitlines())
    size_bytes = len(file_in.content.encode("utf-8"))

    # Check if file exists
    existing_file = db.query(CodeFile).filter(
        CodeFile.repository_id == repository_id,
        CodeFile.file_path == file_in.file_path
    ).first()

    if existing_file:
        existing_file.content = file_in.content
        existing_file.language = lang
        existing_file.size_bytes = size_bytes
        existing_file.line_count = line_count
        existing_file.content_hash = content_hash
        db_file = existing_file
    else:
        db_file = CodeFile(
            repository_id=repository_id,
            file_path=file_in.file_path,
            language=lang,
            content=file_in.content,
            size_bytes=size_bytes,
            line_count=line_count,
            content_hash=content_hash
        )
        db.add(db_file)

    db.commit()
    db.refresh(db_file)

    # Clear previous chunks for this file
    db.query(Chunk).filter(Chunk.code_file_id == db_file.id).delete()
    db.commit()

    # Create chunks for this source file immediately
    if lang == "python":
        raw_chunks = PythonChunker.chunk(db_file.content, db_file.file_path)
    elif lang == "markdown":
        raw_chunks = MarkdownChunker.chunk(db_file.content, db_file.file_path)
    elif lang in ("javascript", "typescript", "typescript-react", "javascript-react"):
        raw_chunks = JSTSChunker.chunk(db_file.content, db_file.file_path)
    else:
        raw_chunks = [{
            "chunk_type": "file",
            "symbol_name": None,
            "start_line": 1,
            "end_line": line_count,
            "content": db_file.content,
            "content_hash": content_hash,
            "token_count": estimate_token_count(db_file.content),
            "metadata": {}
        }]

    new_chunks = []
    for rc in raw_chunks:
        db_chunk = Chunk(
            project_id=repo.project_id,
            repository_id=repository_id,
            code_file_id=db_file.id,
            source_type="code",
            chunk_type=rc["chunk_type"],
            language=lang,
            file_path=db_file.file_path,
            symbol_name=rc["symbol_name"],
            start_line=rc["start_line"],
            end_line=rc["end_line"],
            content=rc["content"],
            content_hash=rc["content_hash"],
            token_count=rc["token_count"],
            metadata_json=json.dumps(rc["metadata"]) if rc["metadata"] else None
        )
        db.add(db_chunk)
        new_chunks.append(db_chunk)

    db.commit()

    # Automatically index vector embeddings for new chunks
    try:
        from app.services.embeddings import EmbeddingService
        from app.models.chunk_embedding import ChunkEmbedding
        from app.core.config import settings

        texts = [c.content for c in new_chunks]
        if texts:
            vectors = EmbeddingService.get_embeddings(texts)
            for chunk_obj, vec in zip(new_chunks, vectors):
                db_emb = ChunkEmbedding(
                    chunk_id=chunk_obj.id,
                    project_id=repo.project_id,
                    embedding_model=settings.EMBEDDING_MODEL,
                    embedding_dimension=settings.EMBEDDING_DIMENSION,
                    embedding=vec
                )
                db.add(db_emb)
            db.commit()
    except Exception as e:
        print(f"Warning: Auto-embedding failed for new source file: {e}")

    return db_file

