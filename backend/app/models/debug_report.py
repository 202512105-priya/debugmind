import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class DebugReport(Base):
    __tablename__ = "debug_reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    uploaded_log_id: Mapped[Optional[int]] = mapped_column(ForeignKey("uploaded_logs.id", ondelete="SET NULL"), nullable=True)
    
    query: Mapped[str] = mapped_column(Text, nullable=False)
    failure_type: Mapped[str] = mapped_column(String(50), nullable=False)  # test_failure, build_failure, etc.
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    likely_root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_fix: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="success")
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    missing_information: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    evidence: Mapped[List["DebugReportEvidence"]] = relationship(
        "DebugReportEvidence", back_populates="report", cascade="all, delete-orphan"
    )
