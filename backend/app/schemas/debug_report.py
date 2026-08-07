import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Literal

class EvidenceItem(BaseModel):
    chunk_id: int
    file_path: Optional[str] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    reason: str

class DebugReportOutput(BaseModel):
    failure_type: Literal[
        "test_failure",
        "build_failure",
        "runtime_error",
        "dependency_error",
        "unknown"
    ]
    summary: str
    likely_root_cause: Optional[str] = None
    evidence: List[EvidenceItem] = Field(default_factory=list)
    suggested_fix: Optional[str] = None
    confidence: float
    missing_information: List[str] = Field(default_factory=list)

class DebugReportCreateRequest(BaseModel):
    project_id: int
    uploaded_log_id: Optional[int] = None
    query: Optional[str] = None
    top_k: int = 5

class DebugReportRead(BaseModel):
    id: int
    project_id: int
    uploaded_log_id: Optional[int] = None
    query: str
    failure_type: str
    summary: str
    likely_root_cause: Optional[str] = None
    suggested_fix: Optional[str] = None
    confidence: float
    status: str
    model_name: str
    missing_information: List[str] = Field(default_factory=list)
    created_at: datetime.datetime
    evidence: List[EvidenceItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
