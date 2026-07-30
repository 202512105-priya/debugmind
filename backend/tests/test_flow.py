def test_end_to_end_ingestion_flow(client, tmp_path):
    # 1. Create a mock repo folder
    repo_dir = tmp_path / "mock_flow_repo"
    repo_dir.mkdir()
    (repo_dir / "main.py").write_text("def test():\n    print(1)", encoding="utf-8")
    
    # 2. Create Project
    proj_resp = client.post("/projects", json={
        "name": "Integration Project",
        "description": "Flow test description",
        "owner_id": 1
    })
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]
    
    # 3. Register Repository
    repo_resp = client.post(f"/projects/{project_id}/repositories", json={
        "name": "Local Repo",
        "source_type": "local",
        "root_path": str(repo_dir)
    })
    assert repo_resp.status_code == 201
    repo_id = repo_resp.json()["id"]
    
    # 4. Trigger Ingestion
    ingest_resp = client.post(f"/repositories/{repo_id}/ingest")
    assert ingest_resp.status_code == 200
    assert ingest_resp.json()["files_ingested"] == 1
    
    # 5. List Files
    files_resp = client.get(f"/repositories/{repo_id}/files")
    assert files_resp.status_code == 200
    files_data = files_resp.json()
    assert len(files_data) == 1
    file_id = files_data[0]["id"]
    
    # 6. Get Code File Detail
    file_resp = client.get(f"/code-files/{file_id}")
    assert file_resp.status_code == 200
    assert file_resp.json()["file_path"] == "main.py"
    
    # 7. Upload Log
    log_resp = client.post(f"/projects/{project_id}/logs", json={
        "filename": "failed_test.log",
        "raw_content": """
FAILED tests/test_auth.py::test_login_success
E   AssertionError: assert 401 == 200
app/auth/middleware.py:42: in validate_token
        """
    })
    assert log_resp.status_code == 201
    log_id = log_resp.json()["id"]
    
    # 8. Parse Log
    parse_resp = client.post(f"/logs/{log_id}/parse")
    assert parse_resp.status_code == 200
    assert parse_resp.json()["events_count"] == 1
    
    # 9. Get Log Events
    events_resp = client.get(f"/logs/{log_id}/events")
    assert events_resp.status_code == 200
    events_data = events_resp.json()
    assert len(events_data) == 1
    
    event = events_data[0]
    assert event["test_name"] == "tests/test_auth.py::test_login_success"
    assert event["error_type"] == "AssertionError"
    
    refs = event["file_references"]
    assert len(refs) == 1
    assert refs[0]["file_path"] == "app/auth/middleware.py"
    assert refs[0]["line_number"] == 42
