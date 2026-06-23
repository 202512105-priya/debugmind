from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from app.db.session import get_db
from app.models.chunk import Chunk
from app.models.chunk_embedding import ChunkEmbedding
from app.models.retrieval_log import RetrievalLog
from app.schemas.search import (
    SemanticSearchRequest, SemanticSearchResponse, SemanticSearchResult,
    KeywordSearchRequest, KeywordSearchResponse, KeywordSearchResult,
    HybridSearchRequest, HybridSearchResponse, HybridSearchResult,
    RerankSearchRequest, RerankSearchResponse, RerankSearchResult
)
from app.services.embeddings import EmbeddingService
from app.services.hybrid_search import HybridSearchService
from app.services.reranker import RelevanceReranker

router = APIRouter()

def log_retrieval(db: Session, project_id: int, query: str, search_type: str, top_k: int, results: list):
    try:
        r_json = json.dumps([
            r.model_dump() if hasattr(r, "model_dump") else r
            for r in results
        ])
        log_entry = RetrievalLog(
            project_id=project_id,
            query=query,
            search_type=search_type,
            top_k=top_k,
            results_count=len(results),
            results_json=r_json
        )
        db.add(log_entry)
        db.commit()
    except Exception:
        db.rollback()

# --- Phase 3 Semantic Search ---
@router.post("/semantic", response_model=SemanticSearchResponse)
def semantic_search(request: SemanticSearchRequest, db: Session = Depends(get_db)):
    try:
        query_vector = EmbeddingService.get_embeddings([request.query])[0]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to embed query: {str(e)}"
        )

    is_sqlite = db.bind.dialect.name == "sqlite"

    if is_sqlite:
        candidates = db.query(ChunkEmbedding, Chunk).join(
            Chunk, Chunk.id == ChunkEmbedding.chunk_id
        ).filter(Chunk.project_id == request.project_id)

        source_type = request.source_type if request.source_type and request.source_type.strip().lower() not in ("", "string") else None
        chunk_type = request.chunk_type if request.chunk_type and request.chunk_type.strip().lower() not in ("", "string") else None

        if source_type:
            candidates = candidates.filter(Chunk.source_type == source_type)
        if chunk_type:
            candidates = candidates.filter(Chunk.chunk_type == chunk_type)

        results = candidates.all()

        scored_results = []
        for db_emb, db_chunk in results:
            emb = db_emb.embedding
            if isinstance(emb, str):
                try:
                    emb = json.loads(emb)
                except Exception:
                    emb = [float(x) for x in emb.strip("[]").split(",") if x.strip()]
            
            similarity = sum(x * y for x, y in zip(query_vector, emb))
            scored_results.append((db_emb, db_chunk, similarity))

        scored_results.sort(key=lambda x: x[2], reverse=True)
        matches = scored_results[:request.top_k]
    else:
        distance = ChunkEmbedding.embedding.cosine_distance(query_vector)
        
        query = db.query(ChunkEmbedding, Chunk, (1 - distance).label("similarity")).join(
            Chunk, Chunk.id == ChunkEmbedding.chunk_id
        ).filter(Chunk.project_id == request.project_id)

        source_type = request.source_type if request.source_type and request.source_type.strip().lower() not in ("", "string") else None
        chunk_type = request.chunk_type if request.chunk_type and request.chunk_type.strip().lower() not in ("", "string") else None

        if source_type:
            query = query.filter(Chunk.source_type == source_type)
        if chunk_type:
            query = query.filter(Chunk.chunk_type == chunk_type)

        query = query.order_by(distance.asc())
        raw_matches = query.limit(request.top_k).all()
        matches = [(db_emb, db_chunk, similarity) for db_emb, db_chunk, similarity in raw_matches]

    search_results = []
    for db_emb, db_chunk, similarity in matches:
        content_preview = db_chunk.content[:200]
        if len(db_chunk.content) > 200:
            content_preview += "..."

        search_results.append(SemanticSearchResult(
            chunk_id=db_chunk.id,
            file_path=db_chunk.file_path,
            symbol_name=db_chunk.symbol_name,
            chunk_type=db_chunk.chunk_type,
            similarity=float(similarity),
            content_preview=content_preview
        ))

    log_retrieval(db, request.project_id, request.query, "semantic", request.top_k, search_results)

    return SemanticSearchResponse(
        query=request.query,
        results=search_results
    )

# --- Phase 4 Keyword Search ---
@router.post("/keyword", response_model=KeywordSearchResponse)
def keyword_search(request: KeywordSearchRequest, db: Session = Depends(get_db)):
    scored = HybridSearchService.search_keyword(
        db=db,
        project_id=request.project_id,
        query=request.query,
        top_k=request.top_k,
        source_type=request.source_type,
        chunk_type=request.chunk_type,
        repository_id=request.repository_id
    )

    results = []
    for chunk, score in scored:
        c_preview = chunk.content[:200] + ("..." if len(chunk.content) > 200 else "")
        results.append(KeywordSearchResult(
            chunk_id=chunk.id,
            file_path=chunk.file_path,
            symbol_name=chunk.symbol_name or chunk.test_name,
            chunk_type=chunk.chunk_type,
            keyword_score=round(score, 4),
            content_preview=c_preview
        ))

    log_retrieval(db, request.project_id, request.query, "keyword", request.top_k, results)

    return KeywordSearchResponse(
        query=request.query,
        results=results
    )

# --- Phase 4 Hybrid Search ---
@router.post("/hybrid", response_model=HybridSearchResponse)
def hybrid_search(request: HybridSearchRequest, db: Session = Depends(get_db)):
    matches = HybridSearchService.search_hybrid(
        db=db,
        project_id=request.project_id,
        query=request.query,
        top_k=request.top_k,
        alpha=request.alpha,
        source_type=request.source_type,
        chunk_type=request.chunk_type,
        repository_id=request.repository_id,
        uploaded_log_id=request.uploaded_log_id
    )

    results = []
    for m in matches:
        results.append(HybridSearchResult(
            chunk_id=m["chunk_id"],
            file_path=m["file_path"],
            symbol_name=m["symbol_name"] or m["chunk"].test_name,
            chunk_type=m["chunk_type"],
            vector_score=m["vector_score"],
            keyword_score=m["keyword_score"],
            hybrid_score=m["hybrid_score"],
            content_preview=m["content_preview"]
        ))

    log_retrieval(db, request.project_id, request.query, "hybrid", request.top_k, results)

    return HybridSearchResponse(
        query=request.query,
        results=results
    )

# --- Phase 4 Reranked Search ---
@router.post("/rerank", response_model=RerankSearchResponse)
def rerank_search(request: RerankSearchRequest, db: Session = Depends(get_db)):
    # Stage 1: Retrieve hybrid candidates
    candidates = HybridSearchService.search_hybrid(
        db=db,
        project_id=request.project_id,
        query=request.query,
        top_k=request.candidate_count,
        alpha=request.alpha,
        source_type=request.source_type,
        chunk_type=request.chunk_type,
        repository_id=request.repository_id,
        uploaded_log_id=request.uploaded_log_id
    )

    # Stage 2: Rerank candidates with explanation reasons
    reranked = RelevanceReranker.rerank(
        query=request.query,
        candidates=candidates,
        top_k=request.top_k
    )

    results = []
    for r in reranked:
        results.append(RerankSearchResult(
            rank=r["rank"],
            chunk_id=r["chunk_id"],
            file_path=r["file_path"],
            symbol_name=r["symbol_name"],
            chunk_type=r["chunk_type"],
            vector_score=r["vector_score"],
            keyword_score=r["keyword_score"],
            hybrid_score=r["hybrid_score"],
            rerank_score=r["rerank_score"],
            reason=r["reason"],
            content_preview=r["content_preview"]
        ))

    log_retrieval(db, request.project_id, request.query, "rerank", request.top_k, results)

    return RerankSearchResponse(
        query=request.query,
        results=results
    )
