import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base

class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    repository_id: Mapped[Optional[int]] = mapped_column(ForeignKey("repositories.id", ondelete="CASCADE"), nullable=True)
    code_file_id: Mapped[Optional[int]] = mapped_column(ForeignKey("code_files.id", ondelete="CASCADE"), nullable=True)
    uploaded_log_id: Mapped[Optional[int]] = mapped_column(ForeignKey("uploaded_logs.id", ondelete="CASCADE"), nullable=True)
    
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., 'code', 'log', 'document'
    chunk_type: Mapped[str] = mapped_column(String(50), nullable=False)   # e.g., 'function', 'class', 'pytest_failure'
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    symbol_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    test_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    start_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    search_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)     # Searchable text combining metadata & content
    
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
