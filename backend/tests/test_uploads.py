def test_upload_log_success(client):
    # Create project first
    proj_resp = client.post("/projects", json={"name": "Log Project", "owner_id": 1})
    project_id = proj_resp.json()["id"]
    
    log_payload = {
        "project_id": project_id,
        "filename": "build.log",
        "raw_content": "Error: compilation failed"
    }
    
    response = client.post("/uploads/logs", json=log_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "build.log"
    assert data["project_id"] == project_id
    assert "id" in data
    assert "created_at" in data

def test_upload_log_project_not_found(client):
    log_payload = {
        "project_id": 99999,
        "filename": "build.log",
        "raw_content": "Error: compilation failed"
    }
    response = client.post("/uploads/logs", json=log_payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_get_log_success(client):
    # Create project
    proj_resp = client.post("/projects", json={"name": "Log Project 2", "owner_id": 1})
    project_id = proj_resp.json()["id"]
    
    # Upload log
    log_resp = client.post("/uploads/logs", json={
        "project_id": project_id,
        "filename": "server.log",
        "raw_content": "Running at port 8000"
    })
    log_id = log_resp.json()["id"]
    
    response = client.get(f"/uploads/logs/{log_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "server.log"
    assert data["project_id"] == project_id
    
def test_get_nonexistent_log(client):
    response = client.get("/uploads/logs/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
