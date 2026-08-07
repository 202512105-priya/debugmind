from typing import Optional
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class FileReference(Base):
    __tablename__ = "file_references"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    parsed_log_event_id: Mapped[int] = mapped_column(ForeignKey("parsed_log_events.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    function_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    parsed_log_event: Mapped["ParsedLogEvent"] = relationship("ParsedLogEvent", back_populates="file_references")
