"""
Redis Caching Service
Provides caching layer for frequently accessed data

Usage:
    from app.services.cache_service import cache_service
    
    # Get cached value
    value = await cache_service.get("key")
    
    # Set cached value with TTL
    await cache_service.set("key", "value", ttl=300)  # 5 minutes
    
    # Delete cached value
    await cache_service.delete("key")
"""
import json
import logging
from typing import Optional, Any, List
from datetime import timedelta
import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis caching service for frequently accessed data"""
    
    def __init__(self):
        """Initialize Redis connection"""
        self.redis: Optional[aioredis.Redis] = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize Redis client"""
        if self._initialized:
            return
        
        try:
            # Parse Redis URL from settings
            redis_url = settings.REDIS_URL or "redis://localhost:6379/0"
            
            self.redis = await aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=10
            )
            
            # Test connection
            await self.redis.ping()
            
            self._initialized = True
            logger.info(f"Redis cache initialized: {redis_url}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            self.redis = None
    
    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            self._initialized = False
            logger.info("Redis cache connection closed")
    
    def _serialize(self, value: Any) -> str:
        """Serialize value for storage"""
        if isinstance(value, (str, int, float, bool)):
            return json.dumps(value)
        return json.dumps(value)
    
    def _deserialize(self, value: Optional[str]) -> Any:
        """Deserialize value from storage"""
        if value is None:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.redis:
            return None
        
        try:
            value = await self.redis.get(key)
            return self._deserialize(value)
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """
        Set value in cache with TTL
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time-to-live in seconds (default: 5 minutes)
        """
        if not self.redis:
            return
        
        try:
            serialized = self._serialize(value)
            await self.redis.setex(key, ttl, serialized)
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
    
    async def delete(self, key: str):
        """Delete value from cache"""
        if not self.redis:
            return
        
        try:
            await self.redis.delete(key)
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
    
    async def delete_pattern(self, pattern: str):
        """Delete all keys matching pattern"""
        if not self.redis:
            return
        
        try:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
                logger.info(f"Deleted {len(keys)} keys matching {pattern}")
        except Exception as e:
            logger.error(f"Error deleting pattern {pattern}: {e}")
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.redis:
            return False
        
        try:
            return await self.redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Error checking cache key {key}: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment counter"""
        if not self.redis:
            return 0
        
        try:
            return await self.redis.incrby(key, amount)
        except Exception as e:
            logger.error(f"Error incrementing cache key {key}: {e}")
            return 0
    
    async def decrement(self, key: str, amount: int = 1) -> int:
        """Decrement counter"""
        if not self.redis:
            return 0
        
        try:
            return await self.redis.decrby(key, amount)
        except Exception as e:
            logger.error(f"Error decrementing cache key {key}: {e}")
            return 0
    
    # ========================================================================
    # High-level caching methods for common use cases
    # ========================================================================
    
    async def get_user_groups(self, user_id: int) -> Optional[List[int]]:
        """Get cached group IDs for user"""
        key = f"user:{user_id}:groups"
        return await self.get(key)
    
    async def set_user_groups(self, user_id: int, group_ids: List[int], ttl: int = 300):
        """Cache user's group IDs (5 minutes default)"""
        key = f"user:{user_id}:groups"
        await self.set(key, group_ids, ttl=ttl)
    
    async def invalidate_user_groups(self, user_id: int):
        """Invalidate user's groups cache"""
        key = f"user:{user_id}:groups"
        await self.delete(key)
    
    async def get_user_profile(self, user_id: int) -> Optional[dict]:
        """Get cached user profile"""
        key = f"user:{user_id}:profile"
        return await self.get(key)
    
    async def set_user_profile(self, user_id: int, profile: dict, ttl: int = 600):
        """Cache user profile (10 minutes default)"""
        key = f"user:{user_id}:profile"
        await self.set(key, profile, ttl=ttl)
    
    async def invalidate_user_profile(self, user_id: int):
        """Invalidate user profile cache"""
        key = f"user:{user_id}:profile"
        await self.delete(key)
    
    async def get_feed(self, user_id: int, sort: str = "newest", page: int = 1) -> Optional[dict]:
        """Get cached feed"""
        key = f"feed:{user_id}:{sort}:{page}"
        return await self.get(key)
    
    async def set_feed(self, user_id: int, feed_data: dict, sort: str = "newest", page: int = 1, ttl: int = 60):
        """Cache feed results (1 minute default)"""
        key = f"feed:{user_id}:{sort}:{page}"
        await self.set(key, feed_data, ttl=ttl)
    
    async def invalidate_user_feed(self, user_id: int):
        """Invalidate all cached feeds for user"""
        pattern = f"feed:{user_id}:*"
        await self.delete_pattern(pattern)
    
    async def get_post_votes(self, post_id: int) -> Optional[dict]:
        """Get cached post votes"""
        key = f"post:{post_id}:votes"
        return await self.get(key)
    
    async def set_post_votes(self, post_id: int, votes: dict, ttl: int = 30):
        """Cache post votes (30 seconds default)"""
        key = f"post:{post_id}:votes"
        await self.set(key, votes, ttl=ttl)
    
    async def invalidate_post_votes(self, post_id: int):
        """Invalidate post votes cache"""
        key = f"post:{post_id}:votes"
        await self.delete(key)
    
    async def get_vault_count(self, user_id: int) -> Optional[int]:
        """Get cached vault article count"""
        key = f"vault:{user_id}:count"
        return await self.get(key)
    
    async def set_vault_count(self, user_id: int, count: int, ttl: int = 300):
        """Cache vault article count (5 minutes default)"""
        key = f"vault:{user_id}:count"
        await self.set(key, count, ttl=ttl)
    
    async def invalidate_vault_count(self, user_id: int):
        """Invalidate vault count cache"""
        key = f"vault:{user_id}:count"
        await self.delete(key)
    
    async def get_group_members(self, group_id: int) -> Optional[List[dict]]:
        """Get cached group members"""
        key = f"group:{group_id}:members"
        return await self.get(key)
    
    async def set_group_members(self, group_id: int, members: List[dict], ttl: int = 300):
        """Cache group members (5 minutes default)"""
        key = f"group:{group_id}:members"
        await self.set(key, members, ttl=ttl)
    
    async def invalidate_group_members(self, group_id: int):
        """Invalidate group members cache"""
        key = f"group:{group_id}:members"
        await self.delete(key)
    
    # ========================================================================
    # Cache statistics and monitoring
    # ========================================================================
    
    async def get_stats(self) -> dict:
        """Get Redis cache statistics"""
        if not self.redis:
            return {"status": "disconnected"}
        
        try:
            info = await self.redis.info()
            return {
                "status": "connected",
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_keys": await self.redis.dbsize(),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(info)
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"status": "error", "error": str(e)}
    
    def _calculate_hit_rate(self, info: dict) -> float:
        """Calculate cache hit rate"""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        
        if total == 0:
            return 0.0
        
        return round((hits / total) * 100, 2)
    
    async def clear_all(self):
        """Clear all cache (use with caution!)"""
        if not self.redis:
            return
        
        try:
            await self.redis.flushdb()
            logger.warning("All cache cleared!")
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")


# Global cache service instance
cache_service = CacheService()


# FastAPI dependency
async def get_cache() -> CacheService:
    """Get cache service instance"""
    if not cache_service._initialized:
        await cache_service.initialize()
    return cache_service
