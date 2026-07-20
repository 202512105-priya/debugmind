from typing import TypedDict, List, Dict, Any, Optional

class DebugAgentState(TypedDict, total=False):
    project_id: int
    uploaded_log_id: Optional[int]
    query: str
    failure_type: str
    search_queries: List[str]
    retrieved_chunks: List[Dict[str, Any]]
    root_cause_hypothesis: Optional[str]
    verification_result: Dict[str, Any]
    final_report_id: Optional[int]
    iteration_count: int
    agent_run_id: int
