import redis
import json
import logging
from typing import Optional, Any
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Global Redis client
_redis_client: Optional[redis.Redis] = None

# Metrics counters
cache_hits = 0
cache_misses = 0


def get_redis() -> Optional[redis.Redis]:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            _redis_client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Caching disabled.")
            _redis_client = None
    return _redis_client


def cache_get(key: str) -> Optional[Any]:
    global cache_hits, cache_misses
    client = get_redis()
    if client is None:
        cache_misses += 1
        return None
    try:
        value = client.get(key)
        if value:
            cache_hits += 1
            return json.loads(value)
        cache_misses += 1
        return None
    except Exception as e:
        logger.warning(f"Cache get error for key {key}: {e}")
        cache_misses += 1
        return None


def cache_set(key: str, value: Any, ttl: int) -> bool:
    client = get_redis()
    if client is None:
        return False
    try:
        client.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as e:
        logger.warning(f"Cache set error for key {key}: {e}")
        return False


def cache_delete(key: str) -> bool:
    client = get_redis()
    if client is None:
        return False
    try:
        client.delete(key)
        return True
    except Exception as e:
        logger.warning(f"Cache delete error for key {key}: {e}")
        return False


def get_cache_stats() -> dict:
    global cache_hits, cache_misses
    total = cache_hits + cache_misses
    return {
        "hits": cache_hits,
        "misses": cache_misses,
        "total": total,
        "hit_rate": round(cache_hits / total * 100, 2) if total > 0 else 0.0,
    }


def check_redis_connection() -> bool:
    try:
        client = get_redis()
        if client:
            client.ping()
            return True
        return False
    except Exception:
        return False
