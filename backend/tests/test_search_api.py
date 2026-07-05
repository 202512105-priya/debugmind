from fastapi.testclient import TestClient

def test_semantic_search_api_flow(client, tmp_path):
    # 1. Create Project
    proj_resp = client.post("/projects", json={"name": "Search Project", "owner_id": 1})
    project_id = proj_resp.json()["id"]
    
    # 2. Add repository and code files
    repo_dir = tmp_path / "search_repo"
    repo_dir.mkdir()
    (repo_dir / "auth.py").write_text("""
def validate_token(token: str):
    # handles validation and authentication middleware
    pass
""", encoding="utf-8")
    (repo_dir / "ui.py").write_text("""
def render_blue_button():
    # displays a blue styling button on the frontend layout
    pass
""", encoding="utf-8")
    
    repo_resp = client.post(f"/projects/{project_id}/repositories", json={
        "name": "Search Repo",
        "source_type": "local",
        "root_path": str(repo_dir)
    })
    repo_id = repo_resp.json()["id"]
    
    # Ingest
    client.post(f"/repositories/{repo_id}/ingest")
    
    # Chunk
    client.post(f"/repositories/{repo_id}/chunk")
    
    # 3. Index Embeddings
    index_resp = client.post(f"/projects/{project_id}/embeddings/index")
    assert index_resp.status_code == 200
    assert index_resp.json()["chunks_indexed"] == 2
    
    # 4. Perform Semantic Search for authentication query
    # "authentication token validate" should retrieve validate_token because of word overlaps ("token", "validate")
    search_resp = client.post("/search/semantic", json={
        "project_id": project_id,
        "query": "authentication token validate",
        "top_k": 2
    })
    assert search_resp.status_code == 200
    results = search_resp.json()["results"]
    assert len(results) == 2
    
    # The first result should be validate_token
    assert results[0]["symbol_name"] == "validate_token"
    
    # 5. Perform Semantic Search for button styling query
    search_resp2 = client.post("/search/semantic", json={
        "project_id": project_id,
        "query": "blue button styling",
        "top_k": 1
    })
    assert search_resp2.status_code == 200
    results2 = search_resp2.json()["results"]
    assert len(results2) == 1
    assert results2[0]["symbol_name"] == "render_blue_button"
