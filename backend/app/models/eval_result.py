from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class EvalResult(Base):
    __tablename__ = "eval_results"

    id = Column(Integer, primary_key=True, index=True)
    eval_run_id = Column(Integer, ForeignKey("eval_runs.id", ondelete="CASCADE"), nullable=False)
    eval_case_id = Column(Integer, ForeignKey("eval_cases.id", ondelete="CASCADE"), nullable=False)
    
    retrieval_recall_at_5 = Column(Float, nullable=False, default=0.0)
    retrieval_precision_at_5 = Column(Float, nullable=False, default=0.0)
    root_cause_score = Column(Float, nullable=False, default=0.0)
    groundedness_score = Column(Float, nullable=False, default=0.0)
    fix_relevance_score = Column(Float, nullable=False, default=0.0)
    hallucination_score = Column(Float, nullable=False, default=0.0)
    format_valid = Column(Boolean, nullable=False, default=True)
    latency_ms = Column(Float, nullable=False, default=0.0)
    estimated_cost = Column(Float, nullable=False, default=0.0)
    raw_result_json = Column(Text, nullable=True)

    run = relationship("EvalRun", back_populates="results")
    case = relationship("EvalCase", back_populates="results")
