from typing import Optional
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class DebugReportEvidence(Base):
    __tablename__ = "debug_report_evidence"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    debug_report_id: Mapped[int] = mapped_column(ForeignKey("debug_reports.id", ondelete="CASCADE"), index=True, nullable=False)
    chunk_id: Mapped[int] = mapped_column(ForeignKey("chunks.id", ondelete="CASCADE"), index=True, nullable=False)
    
    file_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    start_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    report: Mapped["DebugReport"] = relationship("DebugReport", back_populates="evidence")
    chunk: Mapped["Chunk"] = relationship("Chunk")
