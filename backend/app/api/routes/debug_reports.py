from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from app.db.session import get_db
from app.models.debug_report import DebugReport
from app.models.project import Project
from app.schemas.debug_report import (
    DebugReportCreateRequest, DebugReportRead, EvidenceItem
)
from app.services.rag_generator import RAGDebugReportService

router = APIRouter()

def format_report_response(report: DebugReport) -> DebugReportRead:
    missing_info = []
    if report.missing_information:
        try:
            missing_info = json.loads(report.missing_information)
        except Exception:
            missing_info = [report.missing_information]

    evidence_list = [
        EvidenceItem(
            chunk_id=ev.chunk_id,
            file_path=ev.file_path,
            start_line=ev.start_line,
            end_line=ev.end_line,
            reason=ev.reason
        )
        for ev in report.evidence
    ]

    return DebugReportRead(
        id=report.id,
        project_id=report.project_id,
        uploaded_log_id=report.uploaded_log_id,
        query=report.query,
        failure_type=report.failure_type,
        summary=report.summary,
        likely_root_cause=report.likely_root_cause,
        suggested_fix=report.suggested_fix,
        confidence=report.confidence,
        status=report.status,
        model_name=report.model_name,
        missing_information=missing_info,
        created_at=report.created_at,
        evidence=evidence_list
    )

@router.post("/debug-reports", response_model=DebugReportRead, status_code=status.HTTP_201_CREATED)
def create_debug_report(req: DebugReportCreateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {req.project_id} not found"
        )

    try:
        report = RAGDebugReportService.generate_report(
            db=db,
            project_id=req.project_id,
            uploaded_log_id=req.uploaded_log_id,
            user_query=req.query,
            top_k=req.top_k
        )
        return format_report_response(report)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate debug report: {str(e)}"
        )

@router.get("/debug-reports/{report_id}", response_model=DebugReportRead)
def get_debug_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(DebugReport).filter(DebugReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Debug report with ID {report_id} not found"
        )
    return format_report_response(report)

@router.get("/projects/{project_id}/debug-reports", response_model=List[DebugReportRead])
def list_project_debug_reports(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    reports = db.query(DebugReport).filter(DebugReport.project_id == project_id).all()
    return [format_report_response(r) for r in reports]
