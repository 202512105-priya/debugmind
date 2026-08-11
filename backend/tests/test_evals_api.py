import pytest

def test_evals_api_flow(client):
    # 1. Seed dataset
    seed_resp = client.post("/eval-datasets/seed")
    assert seed_resp.status_code == 201
    dataset = seed_resp.json()
    assert dataset["name"] == "DebugMind Golden Baseline"
    dataset_id = dataset["id"]

    # 2. List datasets
    list_resp = client.get("/eval-datasets")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # 3. Create EvalRun
    run_resp = client.post("/eval-runs", json={
        "dataset_id": dataset_id,
        "run_name": "pytest-test-run"
    })
    assert run_resp.status_code == 201
    run_data = run_resp.json()
    eval_run_id = run_data["id"]
    assert run_data["status"] == "completed"

    # 4. Get EvalRun
    get_run_resp = client.get(f"/eval-runs/{eval_run_id}")
    assert get_run_resp.status_code == 200
    assert get_run_resp.json()["id"] == eval_run_id

    # 5. List EvalResults
    results_resp = client.get(f"/eval-runs/{eval_run_id}/results")
    assert results_resp.status_code == 200
    results = results_resp.json()
    assert len(results) == 5

    # 6. Get EvalSummary
    summary_resp = client.get(f"/eval-runs/{eval_run_id}/summary")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["cases_total"] == 5
    assert summary["retrieval_recall_at_5_avg"] >= 0.8
    assert summary["format_valid_rate"] == 1.0
