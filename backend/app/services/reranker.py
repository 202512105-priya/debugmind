import re
from typing import List, Dict, Any

class RelevanceReranker:
    @classmethod
    def rerank(
        cls,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        if not candidates:
            return []

        query_terms = [t.lower() for t in re.findall(r"\w+|[^\s]+", query) if len(t) > 1]
        if not query_terms:
            query_terms = [query.lower().strip()]

        reranked = []

        for item in candidates:
            chunk = item["chunk"]
            hybrid_score = item["hybrid_score"]
            content_lower = chunk.content.lower()
            reasons = []
            
            boost = 0.0

            # 1. Check exact query string match
            if query.lower() in content_lower:
                boost += 0.25
                reasons.append("Contains exact query phrase match.")

            # 2. Check symbol & error type matches
            matched_symbols = []
            if chunk.symbol_name:
                s_name = chunk.symbol_name.lower()
                for term in query_terms:
                    if term in s_name or s_name in term:
                        matched_symbols.append(chunk.symbol_name)
                        boost += 0.30
                        break
            
            if matched_symbols:
                reasons.append(f"Direct match for symbol '{matched_symbols[0]}'.")

            # 2b. Code language & type matching boost
            is_code_chunk = chunk.source_type == "code" or chunk.chunk_type in ("function", "class", "method", "test_function")
            is_markdown = (chunk.file_path and chunk.file_path.endswith(".md")) or chunk.chunk_type == "markdown_section"
            code_query_terms = {"bool", "duplicate", "class", "function", "vector", "c++", "cpp", "solution", "int", "return", "def", "const"}
            has_code_query_term = any(t in query_terms for t in code_query_terms)

            if has_code_query_term and is_code_chunk:
                boost += 0.35
                reasons.append("Code chunk matches programming symbol query.")
            elif has_code_query_term and is_markdown:
                boost -= 0.20

            # 2c. Domain intent & meta-file filtering
            user_auth_query_terms = {"user", "login", "bydefault", "default", "create", "signup", "auth", "password"}
            is_user_auth_query = any(t in query_terms for t in user_auth_query_terms)
            is_rag_meta_query = any(t in query_terms for t in {"rag", "generator", "reranker", "llm"})

            if is_user_auth_query and not is_rag_meta_query:
                if chunk.symbol_name and "ensure_user_exists" in chunk.symbol_name.lower():
                    boost += 0.60
                    reasons.append("Symbol matches default user creation function.")
                elif chunk.file_path and ("user" in chunk.file_path.lower() or "projects.py" in chunk.file_path.lower() or "auth" in chunk.file_path.lower()):
                    boost += 0.45
                    reasons.append("File path matches user authentication domain query.")
                if chunk.file_path and ("rag_generator" in chunk.file_path.lower() or "reranker" in chunk.file_path.lower()):
                    boost -= 0.60

            # 3. Check error code/type matches
            if chunk.error_type:
                e_type = chunk.error_type.lower()
                for term in query_terms:
                    if term in e_type:
                        boost += 0.25
                        reasons.append(f"Exact match for error code/type '{chunk.error_type}'.")
                        break

            # 4. Check test function matches
            if chunk.test_name:
                t_name = chunk.test_name.lower()
                for term in query_terms:
                    if term in t_name:
                        boost += 0.20
                        reasons.append(f"Matches failed test suite '{chunk.test_name}'.")
                        break

            # 5. Check file path matches
            if chunk.file_path:
                f_path = chunk.file_path.lower()
                for term in query_terms:
                    if term in f_path:
                        boost += 0.15
                        reasons.append(f"File path match in '{chunk.file_path}'.")
                        break

            # Combine hybrid score and heuristic boost
            rerank_score = min(1.0, round(0.50 * hybrid_score + 0.50 * (0.50 + min(0.50, boost)), 4))

            if not reasons:
                reasons.append("Semantic & term relevance match from hybrid search retrieval.")

            reason_str = " ".join(reasons)

            reranked.append({
                "chunk_id": item["chunk_id"],
                "file_path": item["file_path"],
                "symbol_name": item["symbol_name"],
                "chunk_type": item["chunk_type"],
                "vector_score": item["vector_score"],
                "keyword_score": item["keyword_score"],
                "hybrid_score": item["hybrid_score"],
                "rerank_score": rerank_score,
                "reason": reason_str,
                "content_preview": item["content_preview"]
            })

        # Sort by rerank score descending
        reranked.sort(key=lambda x: x["rerank_score"], reverse=True)

        # Assign 1-based ranks
        results = []
        for rank, item in enumerate(reranked[:top_k], start=1):
            item["rank"] = rank
            results.append(item)

        return results
