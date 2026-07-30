from app.services.rag_generator import RAGDebugReportService
from app.schemas.debug_report import DebugReportOutput, EvidenceItem
from app.models.llm_call import LLMCall

def test_context_formatter_and_citation_validation():
    retrieved = [
        {
            "chunk_id": 101,
            "file_path": "app/auth/middleware.py",
            "start_line": 40,
            "end_line": 50,
            "symbol_name": "validate_token",
            "chunk_type": "function",
            "content_preview": "if not token: raise HTTPException(401)"
        }
    ]

    context_text = RAGDebugReportService.format_context(retrieved)
    assert "[chunk_id: 101]" in context_text
    assert "app/auth/middleware.py" in context_text

    # Test Citation Validation
    valid_chunk_ids = {101}
    report_output = DebugReportOutput(
        failure_type="test_failure",
        summary="Test failure",
        likely_root_cause="Missing token",
        evidence=[
            EvidenceItem(chunk_id=101, file_path="app/auth/middleware.py", reason="Token check"),
            EvidenceItem(chunk_id=999, file_path="fake.py", reason="Fake chunk") # Should be filtered
        ],
        confidence=0.8,
        missing_information=[]
    )

    validated = RAGDebugReportService.validate_citations(report_output, valid_chunk_ids)
    assert len(validated.evidence) == 1
    assert validated.evidence[0].chunk_id == 101


def test_debug_report_api_flow(client, tmp_path):
    # 1. Create Project
    proj_resp = client.post("/projects", json={"name": "RAG Project", "owner_id": 1})
    project_id = proj_resp.json()["id"]

    # 2. Setup mock repo files
    repo_dir = tmp_path / "rag_repo"
    repo_dir.mkdir()
    (repo_dir / "auth.py").write_text("""
def validate_token(token: str):
    if not token:
        raise ValueError("401 Unauthorized token")
""", encoding="utf-8")

    repo_resp = client.post(f"/projects/{project_id}/repositories", json={
        "name": "RAG Repo",
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

    # Index embeddings
    client.post(f"/projects/{project_id}/embeddings/index")

    # 4. Generate Debug Report
    gen_resp = client.post("/debug-reports", json={
        "project_id": project_id,
        "uploaded_log_id": log_id,
        "query": "why is test_login returning 401 unauthorized token?",
        "top_k": 3
    })
    assert gen_resp.status_code == 201
    report = gen_resp.json()
    report_id = report["id"]

    assert report["project_id"] == project_id
    assert report["uploaded_log_id"] == log_id
    assert report["failure_type"] == "test_failure"
    assert "401" in report["summary"] or "token" in report["summary"]
    assert report["confidence"] >= 0.5
    assert len(report["evidence"]) > 0

    # 5. Fetch Debug Report by ID
    get_resp = client.get(f"/debug-reports/{report_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == report_id

    # 6. List Debug Reports for Project
    list_resp = client.get(f"/projects/{project_id}/debug-reports")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
