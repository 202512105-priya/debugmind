from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from app.db.session import get_db
from app.models.uploaded_log import UploadedLog
from app.models.parsed_log_event import ParsedLogEvent
from app.models.file_reference import FileReference
from app.models.chunk import Chunk
from app.schemas.uploaded_log import UploadedLogRead
from app.schemas.parsed_log_event import ParsedLogEventRead
from app.schemas.chunk import ChunkRead
from app.services.parser import LogParserService
from app.services.chunkers import LogChunker

router = APIRouter()

@router.get("/{log_id}", response_model=UploadedLogRead)
def get_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(UploadedLog).filter(UploadedLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Uploaded log with ID {log_id} not found"
        )
    return log

@router.post("/{log_id}/parse", status_code=status.HTTP_200_OK)
def parse_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(UploadedLog).filter(UploadedLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Uploaded log with ID {log_id} not found"
        )

    # Parse raw content
    events = LogParserService.parse_log(log.raw_content)

    # Clear previous parsing attempts for this log
    old_event_ids = [e.id for e in db.query(ParsedLogEvent.id).filter(ParsedLogEvent.uploaded_log_id == log_id).all()]
    if old_event_ids:
        db.query(FileReference).filter(FileReference.parsed_log_event_id.in_(old_event_ids)).delete(synchronize_session=False)
    db.query(ParsedLogEvent).filter(ParsedLogEvent.uploaded_log_id == log_id).delete(synchronize_session=False)
    db.commit()

    # Save new events
    for evt_data in events:
        db_evt = ParsedLogEvent(
            uploaded_log_id=log_id,
            event_type=evt_data["event_type"],
            test_name=evt_data["test_name"],
            error_type=evt_data["error_type"],
            error_message=evt_data["error_message"],
            raw_block=evt_data["raw_block"]
        )
        db.add(db_evt)
        db.flush()  # gets db_evt.id

        # Save file references
        for ref_data in evt_data["file_references"]:
            db_ref = FileReference(
                parsed_log_event_id=db_evt.id,
                file_path=ref_data["file_path"],
                line_number=ref_data["line_number"],
                function_name=ref_data["function_name"]
            )
            db.add(db_ref)

    # Clear previous chunks for this log and generate new chunks
    db.query(Chunk).filter(Chunk.uploaded_log_id == log_id).delete()
    db.commit()

    raw_chunks = LogChunker.chunk(log.raw_content, log.id)
    chunks_created = 0
    for rc in raw_chunks:
        db_chunk = Chunk(
            project_id=log.project_id,
            uploaded_log_id=log_id,
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
        chunks_created += 1

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully parsed log, generated {len(events)} events and created {chunks_created} chunks",
        "events_count": len(events),
        "chunks_created": chunks_created
    }

@router.get("/{log_id}/events", response_model=List[ParsedLogEventRead])
def get_log_events(log_id: int, db: Session = Depends(get_db)):
    log = db.query(UploadedLog).filter(UploadedLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Uploaded log with ID {log_id} not found"
        )
    return log.parsed_log_events

# --- Phase 2 Chunking ---

@router.post("/{log_id}/chunk", status_code=status.HTTP_200_OK)
def chunk_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(UploadedLog).filter(UploadedLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Uploaded log with ID {log_id} not found"
        )

    # 1. Clear previous chunks for this log
    db.query(Chunk).filter(Chunk.uploaded_log_id == log_id).delete()
    db.commit()

    # 2. Chunk log raw content
    raw_chunks = LogChunker.chunk(log.raw_content, log.id)
    chunks_created = 0

    for rc in raw_chunks:
        db_chunk = Chunk(
            project_id=log.project_id,
            uploaded_log_id=log_id,
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
        chunks_created += 1

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully chunked log and created {chunks_created} chunks",
        "chunks_created": chunks_created
    }

@router.get("/{log_id}/chunks", response_model=List[ChunkRead])
def list_log_chunks(log_id: int, db: Session = Depends(get_db)):
    log = db.query(UploadedLog).filter(UploadedLog.id == log_id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Uploaded log with ID {log_id} not found"
        )
    
    chunks = db.query(Chunk).filter(Chunk.uploaded_log_id == log_id).all()
    return chunks
