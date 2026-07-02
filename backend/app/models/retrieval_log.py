import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base

class RetrievalLog(Base):
    __tablename__ = "retrieval_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    
    query: Mapped[str] = mapped_column(Text, nullable=False)
    search_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., 'keyword', 'hybrid', 'rerank'
    top_k: Mapped[int] = mapped_column(Integer, nullable=False)
    results_count: Mapped[int] = mapped_column(Integer, nullable=False)
    results_json: Mapped[str] = mapped_column(Text, nullable=False)  # JSON payload of retrieved results & scores

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
