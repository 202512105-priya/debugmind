from app.models.retrieval_log import RetrievalLog

def test_phase4_hybrid_and_rerank_flow(client, tmp_path):
    # 1. Create Project
    proj_resp = client.post("/projects", json={"name": "Phase 4 Project", "owner_id": 1})
    project_id = proj_resp.json()["id"]

    # 2. Add repository with exact error identifiers and symbols
    repo_dir = tmp_path / "phase4_repo"
    repo_dir.mkdir()
    (repo_dir / "tenant_middleware.py").write_text("""
def validate_tenant(tenant_id: str):
    # ERR_AUTH_TENANT_REQUIRED thrown when tenant is missing or invalid
    if not tenant_id:
        raise ValueError("ERR_AUTH_TENANT_REQUIRED")
""", encoding="utf-8")
    (repo_dir / "button.py").write_text("""
def render_button():
    return "blue"
""", encoding="utf-8")

    repo_resp = client.post(f"/projects/{project_id}/repositories", json={
        "name": "Phase 4 Repo",
        "source_type": "local",
        "root_path": str(repo_dir)
    })
    repo_id = repo_resp.json()["id"]

    # Ingest & Chunk Repository
    client.post(f"/repositories/{repo_id}/ingest")
    client.post(f"/repositories/{repo_id}/chunk")

    # Upload & Chunk Log
    log_resp = client.post(f"/projects/{project_id}/logs", json={
        "filename": "tenant_failure.log",
        "raw_content": "FAILED tests/test_tenant.py::test_tenant_auth\nE   ValueError: ERR_AUTH_TENANT_REQUIRED\ntenant_middleware.py:4: in validate_tenant"
    })
    log_id = log_resp.json()["id"]
    client.post(f"/logs/{log_id}/chunk")

    # Index Embeddings
    client.post(f"/projects/{project_id}/embeddings/index")

    # 3. Test Keyword Search
    kw_resp = client.post("/search/keyword", json={
        "project_id": project_id,
        "query": "ERR_AUTH_TENANT_REQUIRED validate_tenant",
        "top_k": 5
    })
    assert kw_resp.status_code == 200
    kw_results = kw_resp.json()["results"]
    assert len(kw_results) > 0
    # Top result should match validate_tenant or tenant_middleware
    assert "validate_tenant" in (kw_results[0]["symbol_name"] or "") or "ERR_AUTH_TENANT_REQUIRED" in kw_results[0]["content_preview"]

    # 4. Test Hybrid Search
    hy_resp = client.post("/search/hybrid", json={
        "project_id": project_id,
        "query": "tenant auth middleware failure ERR_AUTH_TENANT_REQUIRED",
        "top_k": 5,
        "alpha": 0.65
    })
    assert hy_resp.status_code == 200
    hy_results = hy_resp.json()["results"]
    assert len(hy_results) > 0
    assert "vector_score" in hy_results[0]
    assert "keyword_score" in hy_results[0]
    assert "hybrid_score" in hy_results[0]

    # 5. Test Reranked Search with Explanations
    rr_resp = client.post("/search/rerank", json={
        "project_id": project_id,
        "query": "why is validate_tenant throwing ERR_AUTH_TENANT_REQUIRED",
        "candidate_count": 10,
        "top_k": 3
    })
    assert rr_resp.status_code == 200
    rr_results = rr_resp.json()["results"]
    assert len(rr_results) > 0
    top_match = rr_results[0]
    assert top_match["rank"] == 1
    assert "reason" in top_match
    assert len(top_match["reason"]) > 0
    assert "ERR_AUTH_TENANT_REQUIRED" in top_match["reason"] or "validate_tenant" in top_match["reason"]
