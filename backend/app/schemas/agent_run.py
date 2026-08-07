import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

class AgentRunCreateRequest(BaseModel):
    project_id: int
    uploaded_log_id: Optional[int] = None
    query: Optional[str] = None

class AgentStepRead(BaseModel):
    id: int
    agent_run_id: int
    step_name: str
    input_json: str
    output_json: str
    latency_ms: float
    status: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class AgentRunRead(BaseModel):
    id: int
    project_id: int
    uploaded_log_id: Optional[int] = None
    query: str
    status: str
    failure_type: Optional[str] = None
    final_report_id: Optional[int] = None
    error_message: Optional[str] = None
    started_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None
    steps: List[AgentStepRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
