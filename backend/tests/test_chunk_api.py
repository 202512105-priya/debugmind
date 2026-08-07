from fastapi.testclient import TestClient

def test_chunking_api_flow(client, tmp_path):
    # 1. Setup mock repo files
    repo_dir = tmp_path / "mock_chunk_repo"
    repo_dir.mkdir()
    (repo_dir / "service.py").write_text("""
class UserService:
    def get_user(self):
        return {}
""", encoding="utf-8")
    
    # 2. Create project
    proj_resp = client.post("/projects", json={"name": "Chunking Project", "owner_id": 1})
    project_id = proj_resp.json()["id"]
    
    # 3. Add repository
    repo_resp = client.post(f"/projects/{project_id}/repositories", json={
        "name": "User Repo",
        "source_type": "local",
        "root_path": str(repo_dir)
    })
    repo_id = repo_resp.json()["id"]
    
    # Ingest repo
    client.post(f"/repositories/{repo_id}/ingest")
    
    # 4. Trigger Repository Chunking
    chunk_resp = client.post(f"/repositories/{repo_id}/chunk")
    assert chunk_resp.status_code == 200
    assert chunk_resp.json()["chunks_created"] == 2 # Class and Method
    
    # 5. List Repository Chunks
    list_resp = client.get(f"/repositories/{repo_id}/chunks")
    assert list_resp.status_code == 200
    repo_chunks = list_resp.json()
    assert len(repo_chunks) == 2
    
    # 6. List Project Chunks
    project_chunks_resp = client.get(f"/projects/{project_id}/chunks")
    assert project_chunks_resp.status_code == 200
    assert len(project_chunks_resp.json()) == 2
    
    # 7. Get Chunk details
    chunk_id = repo_chunks[0]["id"]
    get_chunk_resp = client.get(f"/chunks/{chunk_id}")
    assert get_chunk_resp.status_code == 200
    assert get_chunk_resp.json()["id"] == chunk_id
    
    # 8. Upload log and chunk
    log_resp = client.post(f"/projects/{project_id}/logs", json={
        "filename": "failed_build.log",
        "raw_content": "FAILED tests/test_auth.py::test_login_success\nE   AssertionError: assert 401 == 200"
    })
    log_id = log_resp.json()["id"]
    
    # Chunk log
    log_chunk_resp = client.post(f"/logs/{log_id}/chunk")
    assert log_chunk_resp.status_code == 200
    assert log_chunk_resp.json()["chunks_created"] == 1
    
    # List Log Chunks
    log_chunks_list = client.get(f"/logs/{log_id}/chunks")
    assert log_chunks_list.status_code == 200
    assert len(log_chunks_list.json()) == 1
    assert log_chunks_list.json()[0]["chunk_type"] == "pytest_failure"
