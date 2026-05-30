def test_create_project(client):
    project_payload = {
        "name": "Test Project",
        "description": "This is a test project",
        "owner_id": 1
    }
    response = client.post("/projects", json=project_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["description"] == "This is a test project"
    assert data["owner_id"] == 1
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data

def test_list_projects(client):
    # Seed a project first
    client.post("/projects", json={"name": "P1", "owner_id": 1})
    client.post("/projects", json={"name": "P2", "owner_id": 1})
    
    response = client.get("/projects")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    names = [p["name"] for p in data]
    assert "P1" in names
    assert "P2" in names

def test_get_project_by_id(client):
    response_create = client.post("/projects", json={"name": "P3", "description": "D3", "owner_id": 1})
    project_id = response_create.json()["id"]
    
    response = client.get(f"/projects/{project_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "P3"
    assert data["description"] == "D3"
    
def test_get_nonexistent_project(client):
    response = client.get("/projects/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Project with ID 99999 not found"
