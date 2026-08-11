from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class EvalDataset(Base):
    __tablename__ = "eval_datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cases = relationship("EvalCase", back_populates="dataset", cascade="all, delete-orphan")
    runs = relationship("EvalRun", back_populates="dataset", cascade="all, delete-orphan")
