from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class EvalRun(Base):
    __tablename__ = "eval_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("eval_datasets.id", ondelete="CASCADE"), nullable=False)
    run_name = Column(String(100), nullable=False)
    system_version = Column(String(50), nullable=False, default="v1.0")
    prompt_version = Column(String(50), nullable=False, default="v1.0")
    embedding_model = Column(String(100), nullable=False, default="text-embedding-3-small")
    reranker_version = Column(String(50), nullable=False, default="v1.0")
    status = Column(String(50), nullable=False, default="running")  # running, completed, failed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    dataset = relationship("EvalDataset", back_populates="runs")
    results = relationship("EvalResult", back_populates="run", cascade="all, delete-orphan")
