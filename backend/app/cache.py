"""
Minimal cache module for Credit Card Processor.
Provides basic cache statistics without complex caching implementation.
"""

from typing import Dict, Any
from datetime import datetime, timezone


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics.
    
    Returns:
        Dictionary with cache statistics for health checks.
        
    Note:
        This is a minimal implementation that returns basic stats
        without actual caching functionality.
    """
    return {
        "cache_enabled": False,
        "cache_type": "disabled",
        "total_keys": 0,
        "hit_rate": 0.0,
        "miss_rate": 0.0,
        "memory_usage": "0 MB",
        "status": "healthy",
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "note": "Caching disabled - using minimal implementation"
    }


def clear_cache() -> bool:
    """
    Clear all cache entries.
    
    Returns:
        True if cache was cleared successfully.
    """
    return True


def get_cache_size() -> int:
    """
    Get current cache size.
    
    Returns:
        Number of items in cache (always 0 for minimal implementation).
    """
    return 0


def cached(ttl_seconds: int = 300):
    """
    Decorator for caching function results.
    
    Args:
        ttl_seconds: Time to live in seconds (ignored in minimal implementation)
        
    Returns:
        Decorator function that passes through without caching.
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # No caching - just call the function directly
            return func(*args, **kwargs)
        return wrapper
    return decorator


def cache(key: str, value: Any = None, ttl_seconds: int = 300):
    """
    Cache a value with a key.
    
    Args:
        key: Cache key
        value: Value to cache (if None, attempts to retrieve)
        ttl_seconds: Time to live in seconds (ignored)
        
    Returns:
        None for set operations, None for get operations (no caching)
    """
    return None


def invalidate_cache_pattern(pattern: str) -> int:
    """
    Invalidate cache entries matching a pattern.
    
    Args:
        pattern: Pattern to match cache keys
        
    Returns:
        Number of invalidated entries (always 0 for minimal implementation)
    """
    return 0


# Export main functions
__all__ = [
    'get_cache_stats',
    'clear_cache', 
    'get_cache_size',
    'cached',
    'cache',
    'invalidate_cache_pattern'
]