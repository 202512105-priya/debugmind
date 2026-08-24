import pytest
from app.security.secret_redaction import redact_secrets
from app.observability.cost import calculate_llm_cost
from app.cache.redis_cache import RedisCache
from app.cache.keys import embedding_key, search_key, report_key
from app.security.rate_limit import RateLimiter

def test_secret_redaction():
    raw_log = "DATABASE_URL=postgresql://admin:secret123@localhost:5432/mydb OPENAI_API_KEY=sk-proj-1234567890abcdef123456 Authorization: Bearer secrettoken123456"
    sanitized = redact_secrets(raw_log)
    
    assert "secret123" not in sanitized
    assert "[REDACTED]" in sanitized
    assert "sk-proj-1234567890abcdef123456" not in sanitized

def test_token_cost_calculator():
    # gpt-4o-mini: 1000 input tokens = $0.00015, 1000 output tokens = $0.0006
    cost = calculate_llm_cost("gpt-4o-mini", input_tokens=1000, output_tokens=1000)
    assert cost == 0.00075

    # text-embedding-3-small: 1000 input tokens = $0.00002
    emb_cost = calculate_llm_cost("text-embedding-3-small", input_tokens=1000, output_tokens=0)
    assert emb_cost == 0.00002

def test_redis_cache_and_keys():
    RedisCache.flush()
    k1 = embedding_key("text-embedding-3-small", "hash123")
    assert k1 == "embedding:text-embedding-3-small:hash123"

    RedisCache.set(k1, [0.1, 0.2, 0.3])
    cached_val = RedisCache.get(k1)
    assert cached_val == [0.1, 0.2, 0.3]

    stats = RedisCache.get_stats()
    assert stats["hits"] == 1
    assert stats["hit_rate"] == 1.0

def test_rate_limiter():
    RateLimiter.reset()
    key = "user_123_agent_run"
    for _ in range(5):
        assert RateLimiter.check_rate_limit(key, limit=5, window_seconds=60) is True

    # 6th request exceeds limit
    assert RateLimiter.check_rate_limit(key, limit=5, window_seconds=60) is False

def test_observability_api_routes(client):
    # Create project
    proj_resp = client.post("/projects", json={"name": "Obs Project", "owner_id": 1})
    project_id = proj_resp.json()["id"]

    # Test usage route
    usage_resp = client.get(f"/projects/{project_id}/usage")
    assert usage_resp.status_code == 200
    u_data = usage_resp.json()
    assert u_data["project_id"] == project_id
    assert "estimated_cost" in u_data

    # Test events route
    events_resp = client.get(f"/projects/{project_id}/events")
    assert events_resp.status_code == 200
    assert isinstance(events_resp.json(), list)

    # Test deep health check
    health_resp = client.get("/health/deep")
    assert health_resp.status_code == 200
    h_data = health_resp.json()
    assert h_data["status"] in ("healthy", "degraded")
    assert "services" in h_data

    # Test metrics route
    metrics_resp = client.get("/metrics")
    assert metrics_resp.status_code == 200
    assert "debugmind_agent_runs_total" in metrics_resp.text
    assert "debugmind_estimated_cost_dollars" in metrics_resp.text
