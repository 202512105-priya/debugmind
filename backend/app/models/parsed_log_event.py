import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class ParsedLogEvent(Base):
    __tablename__ = "parsed_log_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    uploaded_log_id: Mapped[int] = mapped_column(ForeignKey("uploaded_logs.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    test_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_block: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    uploaded_log: Mapped["UploadedLog"] = relationship("UploadedLog", back_populates="parsed_log_events")
    file_references: Mapped[List["FileReference"]] = relationship("FileReference", back_populates="parsed_log_event", cascade="all, delete-orphan")
