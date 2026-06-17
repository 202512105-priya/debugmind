import hashlib
import random
import re
from typing import List
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    @classmethod
    def get_embeddings(cls, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
            
        provider = settings.EMBEDDING_PROVIDER.lower()
        
        if provider == "openai":
            return cls._get_openai_embeddings(texts)
        elif provider == "local":
            try:
                return cls._get_local_embeddings(texts)
            except ImportError:
                logger.warning(
                    "sentence-transformers is not installed. Falling back to mock embeddings."
                )
                return cls._get_mock_embeddings(texts)
        else:
            return cls._get_mock_embeddings(texts)

    @classmethod
    def _get_mock_embeddings(cls, texts: List[str]) -> List[List[float]]:
        results = []
        dimension = settings.EMBEDDING_DIMENSION
        
        for text in texts:
            # Tokenize into lowercase alphanumeric words
            words = re.findall(r"\w+", text.lower())
            if not words:
                words = [text.lower()]
                
            # Sum up deterministic random vectors for each word
            accum = [0.0] * dimension
            for word in words:
                h = hashlib.sha256(word.encode("utf-8")).digest()
                seed_val = int.from_bytes(h, byteorder="big") & 0xffffffff  # fit inside 32-bit int
                local_rand = random.Random(seed_val)
                for idx in range(dimension):
                    accum[idx] += local_rand.uniform(-1, 1)
                    
            # Normalize vector to unit length
            norm = sum(x * x for x in accum) ** 0.5
            if norm > 0:
                normalized = [x / norm for x in accum]
            else:
                normalized = [0.0] * dimension
            results.append(normalized)
            
        return results

    @classmethod
    def _get_local_embeddings(cls, texts: List[str]) -> List[List[float]]:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(settings.EMBEDDING_MODEL)
        embeddings = model.encode(texts)
        return [e.tolist() for e in embeddings]

    @classmethod
    def _get_openai_embeddings(cls, texts: List[str]) -> List[List[float]]:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY config is required when using openai provider")
            
        import httpx
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}"
        }
        payload = {
            "input": texts,
            "model": settings.EMBEDDING_MODEL
        }
        
        response = httpx.post(url, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()
        
        data = response.json()
        sorted_data = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in sorted_data]
