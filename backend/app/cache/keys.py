import hashlib

def embedding_key(model: str, chunk_hash: str) -> str:
    return f"embedding:{model.lower()}:{chunk_hash}"

def search_key(project_id: int, query: str, filters: str = "") -> str:
    raw = f"{query.strip().lower()}:{filters}"
    q_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    return f"search:{project_id}:{q_hash}"

def report_key(log_hash: str, prompt_version: str = "v1.0", model_name: str = "gpt-4o-mini") -> str:
    return f"report:{log_hash}:{prompt_version}:{model_name.lower()}"
