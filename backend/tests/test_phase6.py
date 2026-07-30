from app.agents.state import DebugAgentState
from app.agents.debug_graph import should_retry_or_write

def test_conditional_retry_routing():
    # 1. Strong grounded evidence -> route to report_writer
    state_strong = DebugAgentState(
        verification_result={"is_grounded": True, "needs_retry": False},
        iteration_count=0
    )
    assert should_retry_or_write(state_strong) == "report_writer"

    # 2. Weak evidence, iteration 0 -> route to query_planner for retry
    state_weak = DebugAgentState(
        verification_result={"is_grounded": False, "needs_retry": True},
        iteration_count=0
    )
    assert should_retry_or_write(state_weak) == "query_planner"

    # 3. Weak evidence, max iterations reached (iteration 2) -> cap retries and route to report_writer
    state_max_retry = DebugAgentState(
        verification_result={"is_grounded": False, "needs_retry": True},
        iteration_count=2
    )
    assert should_retry_or_write(state_max_retry) == "report_writer"


def test_agent_run_api_flow(client, tmp_path):
    # 1. Create Project
    proj_resp = client.post("/projects", json={"name": "Agent Project", "owner_id": 1})
    project_id = proj_resp.json()["id"]

    # 2. Setup mock repo files
    repo_dir = tmp_path / "agent_repo"
    repo_dir.mkdir()
    (repo_dir / "auth.py").write_text("""
def validate_token(token: str):
    if not token:
        raise ValueError("401 Unauthorized token")
""", encoding="utf-8")

    repo_resp = client.post(f"/projects/{project_id}/repositories", json={
        "name": "Agent Repo",
        "source_type": "local",
        "root_path": str(repo_dir)
    })
    repo_id = repo_resp.json()["id"]

    client.post(f"/repositories/{repo_id}/ingest")
    client.post(f"/repositories/{repo_id}/chunk")

    # 3. Upload Log
    log_resp = client.post(f"/projects/{project_id}/logs", json={
        "filename": "failed_auth.log",
        "raw_content": "FAILED tests/test_auth.py::test_login\nE   ValueError: 401 Unauthorized token"
    })
    log_id = log_resp.json()["id"]
    client.post(f"/logs/{log_id}/chunk")
    client.post(f"/projects/{project_id}/embeddings/index")

    # 4. Trigger Agent Run
    run_resp = client.post("/agent-runs", json={
        "project_id": project_id,
        "uploaded_log_id": log_id,
        "query": "why is test_login returning 401 unauthorized token?"
    })
    assert run_resp.status_code == 201
    run_data = run_resp.json()
    run_id = run_data["id"]

    assert run_data["status"] == "completed"
    assert run_data["failure_type"] == "test_failure"
    assert run_data["final_report_id"] is not None
    assert len(run_data["steps"]) >= 6

    # 5. Fetch Agent Run by ID
    get_run_resp = client.get(f"/agent-runs/{run_id}")
    assert get_run_resp.status_code == 200
    assert get_run_resp.json()["id"] == run_id

    # 6. List Agent Steps for Run
    steps_resp = client.get(f"/agent-runs/{run_id}/steps")
    assert steps_resp.status_code == 200
    steps = steps_resp.json()
    step_names = [s["step_name"] for s in steps]

    assert "classifier" in step_names
    assert "query_planner" in step_names
    assert "retriever" in step_names
    assert "root_cause_analyzer" in step_names
    assert "verifier" in step_names
    assert "report_writer" in step_names
