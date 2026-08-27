import datetime
from typing import Optional, List
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    clone_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    source_type: Mapped[str] = mapped_column(String(50), default="local")
    root_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(50), default="pending")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="repositories")
    code_files: Mapped[List["CodeFile"]] = relationship("CodeFile", back_populates="repository", cascade="all, delete-orphan")
