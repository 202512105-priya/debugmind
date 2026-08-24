import json
import time
from typing import Optional, Any, Dict

class RedisCache:
    _in_memory_store: Dict[str, Dict[str, Any]] = {}
    _hits: int = 0
    _misses: int = 0

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        # Check in-memory store
        item = cls._in_memory_store.get(key)
        if item:
            expires_at = item.get("expires_at")
            if expires_at and time.time() > expires_at:
                del cls._in_memory_store[key]
                cls._misses += 1
                return None
            cls._hits += 1
            return item.get("value")

        cls._misses += 1
        return None

    @classmethod
    def set(cls, key: str, value: Any, ttl_seconds: Optional[int] = 3600) -> None:
        expires_at = time.time() + ttl_seconds if ttl_seconds else None
        cls._in_memory_store[key] = {
            "value": value,
            "expires_at": expires_at
        }

    @classmethod
    def delete(cls, key: str) -> None:
        cls._in_memory_store.pop(key, None)

    @classmethod
    def flush(cls) -> None:
        cls._in_memory_store.clear()
        cls._hits = 0
        cls._misses = 0

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        total = cls._hits + cls._misses
        hit_rate = round(cls._hits / total, 4) if total > 0 else 0.0
        return {
            "hits": cls._hits,
            "misses": cls._misses,
            "total_requests": total,
            "hit_rate": hit_rate,
            "keys_count": len(cls._in_memory_store)
        }
