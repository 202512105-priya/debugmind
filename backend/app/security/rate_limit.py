import time
from typing import Dict, List

class RateLimiter:
    _requests_window: Dict[str, List[float]] = {}

    @classmethod
    def check_rate_limit(cls, key: str, limit: int = 10, window_seconds: int = 3600) -> bool:
        now = time.time()
        timestamps = cls._requests_window.get(key, [])
        
        # Filter out expired timestamps
        cutoff = now - window_seconds
        valid_timestamps = [t for t in timestamps if t > cutoff]

        if len(valid_timestamps) >= limit:
            cls._requests_window[key] = valid_timestamps
            return False  # Limit exceeded

        valid_timestamps.append(now)
        cls._requests_window[key] = valid_timestamps
        return True  # Allowed

    @classmethod
    def reset(cls) -> None:
        cls._requests_window.clear()
