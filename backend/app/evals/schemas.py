import json
from pydantic import BaseModel, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
import datetime

class EvalCaseBase(BaseModel):
    case_id: str
    project_name: Optional[str] = None
    input_log: str
    user_query: str
    expected_failure_type: str
    expected_root_cause: str
    expected_relevant_files: List[str]
    expected_fix_keywords: List[str]

    @field_validator("expected_relevant_files", "expected_fix_keywords", mode="before")
    @classmethod
    def parse_json_string_list(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [v]
        return v

class EvalCaseCreate(EvalCaseBase):
    pass

class EvalCaseRead(EvalCaseBase):
    id: int
    dataset_id: int
    created_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)

class EvalDatasetCreate(BaseModel):
    name: str
    version: str
    description: Optional[str] = None

class EvalDatasetRead(EvalDatasetCreate):
    id: int
    created_at: datetime.datetime
    cases: List[EvalCaseRead] = []
    model_config = ConfigDict(from_attributes=True)

class EvalRunCreate(BaseModel):
    dataset_id: int
    run_name: str
    system_version: Optional[str] = "v1.0"
    prompt_version: Optional[str] = "v1.0"
    embedding_model: Optional[str] = "text-embedding-3-small"
    reranker_version: Optional[str] = "v1.0"

class EvalResultRead(BaseModel):
    id: int
    eval_run_id: int
    eval_case_id: int
    retrieval_recall_at_5: float
    retrieval_precision_at_5: float
    root_cause_score: float
    groundedness_score: float
    fix_relevance_score: float
    hallucination_score: float
    format_valid: bool
    latency_ms: float
    estimated_cost: float
    raw_result_json: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class EvalRunRead(BaseModel):
    id: int
    dataset_id: int
    run_name: str
    system_version: str
    prompt_version: str
    embedding_model: str
    reranker_version: str
    status: str
    started_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None
    model_config = ConfigDict(from_attributes=True)

class EvalSummaryRead(BaseModel):
    eval_run_id: int
    dataset_id: int
    run_name: str
    cases_total: int
    retrieval_recall_at_5_avg: float
    retrieval_precision_at_5_avg: float
    root_cause_score_avg: float
    groundedness_score_avg: float
    fix_relevance_score_avg: float
    hallucination_score_avg: float
    format_valid_rate: float
    avg_latency_ms: float
    avg_estimated_cost: float

class JudgeRubricOutput(BaseModel):
    root_cause_score: float  # 1.0 - 5.0
    groundedness_score: float  # 1.0 - 5.0
    fix_relevance_score: float  # 1.0 - 5.0
    hallucination_score: float  # 1.0 - 5.0
    explanation: Optional[str] = None
