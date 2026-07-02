from pydantic import BaseModel
from typing import List, Optional

# --- Phase 3 Semantic Search Schemas ---
class SemanticSearchRequest(BaseModel):
    project_id: int
    query: str
    top_k: int = 5
    source_type: Optional[str] = None
    chunk_type: Optional[str] = None
    uploaded_log_id: Optional[int] = None

class SemanticSearchResult(BaseModel):
    chunk_id: int
    file_path: Optional[str] = None
    symbol_name: Optional[str] = None
    chunk_type: str
    similarity: float
    content_preview: str

class SemanticSearchResponse(BaseModel):
    query: str
    results: List[SemanticSearchResult]


# --- Phase 4 Keyword Search Schemas ---
class KeywordSearchRequest(BaseModel):
    project_id: int
    query: str
    top_k: int = 10
    repository_id: Optional[int] = None
    uploaded_log_id: Optional[int] = None
    source_type: Optional[str] = None
    chunk_type: Optional[str] = None

class KeywordSearchResult(BaseModel):
    chunk_id: int
    file_path: Optional[str] = None
    symbol_name: Optional[str] = None
    chunk_type: str
    keyword_score: float
    content_preview: str

class KeywordSearchResponse(BaseModel):
    query: str
    results: List[KeywordSearchResult]


# --- Phase 4 Hybrid Search Schemas ---
class HybridSearchRequest(BaseModel):
    project_id: int
    query: str
    top_k: int = 10
    alpha: float = 0.65
    repository_id: Optional[int] = None
    uploaded_log_id: Optional[int] = None
    source_type: Optional[str] = None
    chunk_type: Optional[str] = None

class HybridSearchResult(BaseModel):
    chunk_id: int
    file_path: Optional[str] = None
    symbol_name: Optional[str] = None
    chunk_type: str
    vector_score: float
    keyword_score: float
    hybrid_score: float
    content_preview: str

class HybridSearchResponse(BaseModel):
    query: str
    results: List[HybridSearchResult]


# --- Phase 4 Reranked Search Schemas ---
class RerankSearchRequest(BaseModel):
    project_id: int
    query: str
    candidate_count: int = 30
    top_k: int = 5
    alpha: float = 0.65
    repository_id: Optional[int] = None
    uploaded_log_id: Optional[int] = None
    source_type: Optional[str] = None
    chunk_type: Optional[str] = None

class RerankSearchResult(BaseModel):
    rank: int
    chunk_id: int
    file_path: Optional[str] = None
    symbol_name: Optional[str] = None
    chunk_type: str
    vector_score: float
    keyword_score: float
    hybrid_score: float
    rerank_score: float
    reason: str
    content_preview: str

class RerankSearchResponse(BaseModel):
    query: str
    results: List[RerankSearchResult]
