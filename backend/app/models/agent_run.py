import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    uploaded_log_id: Mapped[Optional[int]] = mapped_column(ForeignKey("uploaded_logs.id", ondelete="SET NULL"), nullable=True)
    
    query: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")  # pending, running, completed, failed
    failure_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    final_report_id: Mapped[Optional[int]] = mapped_column(ForeignKey("debug_reports.id", ondelete="SET NULL"), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    steps: Mapped[List["AgentStep"]] = relationship(
        "AgentStep", back_populates="run", cascade="all, delete-orphan"
    )
    final_report: Mapped[Optional["DebugReport"]] = relationship("DebugReport")
