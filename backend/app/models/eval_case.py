from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class EvalCase(Base):
    __tablename__ = "eval_cases"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("eval_datasets.id", ondelete="CASCADE"), nullable=False)
    case_id = Column(String(100), nullable=False)
    project_name = Column(String(100), nullable=True)
    input_log = Column(Text, nullable=False)
    user_query = Column(Text, nullable=False)
    expected_failure_type = Column(String(50), nullable=False)
    expected_root_cause = Column(Text, nullable=False)
    expected_relevant_files = Column(Text, nullable=False)  # JSON string list
    expected_fix_keywords = Column(Text, nullable=False)    # JSON string list
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("EvalDataset", back_populates="cases")
    results = relationship("EvalResult", back_populates="case", cascade="all, delete-orphan")
