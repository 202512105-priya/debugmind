import re
import json
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.chunk import Chunk
from app.models.chunk_embedding import ChunkEmbedding
from app.services.embeddings import EmbeddingService

class HybridSearchService:
    @staticmethod
    def build_search_text(
        file_path: Optional[str],
        symbol_name: Optional[str],
        test_name: Optional[str],
        error_type: Optional[str],
        content: str
    ) -> str:
        parts = []
        if file_path:
            parts.append(f"file:{file_path}")
        if symbol_name:
            parts.append(f"symbol:{symbol_name}")
        if test_name:
            parts.append(f"test:{test_name}")
        if error_type:
            parts.append(f"error:{error_type}")
        parts.append(content)
        return " ".join(parts)

    @classmethod
    def search_keyword(
        cls,
        db: Session,
        project_id: int,
        query: str,
        top_k: int = 10,
        source_type: Optional[str] = None,
        chunk_type: Optional[str] = None,
        repository_id: Optional[int] = None,
        uploaded_log_id: Optional[int] = None
    ) -> List[Tuple[Chunk, float]]:
        if not query or not query.strip():
            return []

        # Extract search terms (alphanumeric words and symbol names)
        terms = [t.lower() for t in re.findall(r"\w+|[^\s]+", query) if len(t) > 1]
        if not terms:
            terms = [query.lower().strip()]

        # Query chunks for project
        q = db.query(Chunk).filter(Chunk.project_id == project_id)

        if repository_id:
            q = q.filter(Chunk.repository_id == repository_id)
        if uploaded_log_id:
            q = q.filter(Chunk.uploaded_log_id == uploaded_log_id)
        if source_type and source_type.strip().lower() not in ("", "string"):
            q = q.filter(Chunk.source_type == source_type)
        if chunk_type and chunk_type.strip().lower() not in ("", "string"):
            q = q.filter(Chunk.chunk_type == chunk_type)

        chunks = q.all()
        scored_chunks = []

        for chunk in chunks:
            text_to_search = chunk.search_text or cls.build_search_text(
                chunk.file_path, chunk.symbol_name, chunk.test_name, chunk.error_type, chunk.content
            )
            text_lower = text_to_search.lower()
            score = 0.0

            # 1. Exact query match bonus
            if query.lower() in text_lower:
                score += 5.0

            # 2. Metadata field exact match bonuses
            for term in terms:
                if chunk.symbol_name and term in chunk.symbol_name.lower():
                    score += 3.0
                if chunk.test_name and term in chunk.test_name.lower():
                    score += 3.0
                if chunk.error_type and term in chunk.error_type.lower():
                    score += 3.0
                if chunk.file_path and term in chunk.file_path.lower():
                    score += 2.0
                
                # Term frequency in content
                occurrences = text_lower.count(term)
                if occurrences > 0:
                    score += min(occurrences * 0.5, 4.0)

            if score > 0:
                scored_chunks.append((chunk, score))

        # Sort by keyword score descending
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        return scored_chunks[:top_k]

    @classmethod
    def normalize_scores(cls, scores_dict: Dict[int, float]) -> Dict[int, float]:
        if not scores_dict:
            return {}
        
        min_val = min(scores_dict.values())
        max_val = max(scores_dict.values())
        
        if max_val == min_val:
            return {k: 1.0 if max_val > 0 else 0.0 for k in scores_dict}
            
        return {
            k: (v - min_val) / (max_val - min_val)
            for k, v in scores_dict.items()
        }

    @classmethod
    def search_hybrid(
        cls,
        db: Session,
        project_id: int,
        query: str,
        top_k: int = 10,
        alpha: float = 0.65,
        source_type: Optional[str] = None,
        chunk_type: Optional[str] = None,
        repository_id: Optional[int] = None,
        uploaded_log_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        # Determine dynamic alpha if default alpha=0.65
        if alpha == 0.65:
            is_symbol_query = bool(re.search(r"^[a-zA-Z_]\w*\([^)]*\)$|^[a-zA-Z_]\w*$", query.strip()))
            is_code_keyword = any(k in query.lower() for k in ("def ", "class ", "function", "bool", "int", "void", "const", "vector"))
            is_nl_question = any(q_word in query.lower() for q_word in ("why ", "how ", "what ", "where ", "explain", "reason"))
            
            if is_symbol_query or is_code_keyword:
                alpha = 0.25  # Prioritize exact BM25 keyword matching for code symbols
            elif is_nl_question:
                alpha = 0.75  # Prioritize semantic vector similarity for natural language questions

        # 1. Fetch Vector Candidates
        query_vector = EmbeddingService.get_embeddings([query])[0]
        is_sqlite = db.bind.dialect.name == "sqlite"

        vector_results: Dict[int, Tuple[Chunk, float]] = {}

        if is_sqlite:
            q_emb = db.query(ChunkEmbedding, Chunk).join(
                Chunk, Chunk.id == ChunkEmbedding.chunk_id
            ).filter(Chunk.project_id == project_id)

            if repository_id:
                q_emb = q_emb.filter(Chunk.repository_id == repository_id)
            if uploaded_log_id:
                q_emb = q_emb.filter(Chunk.uploaded_log_id == uploaded_log_id)
            if source_type and source_type.strip().lower() not in ("", "string"):
                q_emb = q_emb.filter(Chunk.source_type == source_type)
            if chunk_type and chunk_type.strip().lower() not in ("", "string"):
                q_emb = q_emb.filter(Chunk.chunk_type == chunk_type)

            for db_emb, db_chunk in q_emb.all():
                emb = db_emb.embedding
                if isinstance(emb, str):
                    try:
                        emb = json.loads(emb)
                    except Exception:
                        emb = [float(x) for x in emb.strip("[]").split(",") if x.strip()]
                similarity = sum(x * y for x, y in zip(query_vector, emb))
                vector_results[db_chunk.id] = (db_chunk, float(similarity))
        else:
            distance = ChunkEmbedding.embedding.cosine_distance(query_vector)
            q_emb = db.query(ChunkEmbedding, Chunk, (1 - distance).label("similarity")).join(
                Chunk, Chunk.id == ChunkEmbedding.chunk_id
            ).filter(Chunk.project_id == project_id)

            if repository_id:
                q_emb = q_emb.filter(Chunk.repository_id == repository_id)
            if uploaded_log_id:
                q_emb = q_emb.filter(Chunk.uploaded_log_id == uploaded_log_id)
            if source_type and source_type.strip().lower() not in ("", "string"):
                q_emb = q_emb.filter(Chunk.source_type == source_type)
            if chunk_type and chunk_type.strip().lower() not in ("", "string"):
                q_emb = q_emb.filter(Chunk.chunk_type == chunk_type)

            q_emb = q_emb.order_by(distance.asc())
            for db_emb, db_chunk, sim in q_emb.limit(top_k * 3).all():
                vector_results[db_chunk.id] = (db_chunk, float(sim))

        # 2. Fetch Keyword Candidates
        keyword_candidates = cls.search_keyword(
            db=db,
            project_id=project_id,
            query=query,
            top_k=top_k * 3,
            source_type=source_type,
            chunk_type=chunk_type,
            repository_id=repository_id,
            uploaded_log_id=uploaded_log_id
        )
        keyword_results: Dict[int, Tuple[Chunk, float]] = {
            chunk.id: (chunk, score) for chunk, score in keyword_candidates
        }

        # Combine all candidate Chunk objects
        all_chunks: Dict[int, Chunk] = {}
        for cid, (chunk, _) in vector_results.items():
            all_chunks[cid] = chunk
        for cid, (chunk, _) in keyword_results.items():
            all_chunks[cid] = chunk

        if not all_chunks:
            return []

        # 3. Normalize Vector & Keyword Scores
        raw_v_scores = {cid: vector_results[cid][1] for cid in all_chunks if cid in vector_results}
        raw_k_scores = {cid: keyword_results[cid][1] for cid in all_chunks if cid in keyword_results}

        norm_v_scores = cls.normalize_scores(raw_v_scores)
        norm_k_scores = cls.normalize_scores(raw_k_scores)

        # 4. Compute Weighted Hybrid Score
        hybrid_matches = []
        for cid, chunk in all_chunks.items():
            v_norm = norm_v_scores.get(cid, 0.0)
            k_norm = norm_k_scores.get(cid, 0.0)
            v_raw = raw_v_scores.get(cid, 0.0)
            k_raw = raw_k_scores.get(cid, 0.0)

            hybrid_score = (alpha * v_norm) + ((1.0 - alpha) * k_norm)

            hybrid_matches.append({
                "chunk": chunk,
                "chunk_id": chunk.id,
                "file_path": chunk.file_path,
                "symbol_name": chunk.symbol_name,
                "chunk_type": chunk.chunk_type,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "vector_score": round(v_raw, 4),
                "keyword_score": round(k_raw, 4),
                "hybrid_score": round(hybrid_score, 4),
                "content_preview": chunk.content[:200] + ("..." if len(chunk.content) > 200 else "")
            })

        hybrid_matches.sort(key=lambda x: x["hybrid_score"], reverse=True)
        return hybrid_matches[:top_k]
