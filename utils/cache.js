/**
 * Simple LRU Cache Utility
 * Usage: cache.getOrSet('key', async () => fetchFromDB())
 */
class Cache {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.inflight = new Map(); // For promise coalescing
    this.lastLog = new Map(); // For log throttling
    this.failedKeys = new Map(); // Negative caching: prevent hammering DB on failures
  }

  /**
   * Get value from cache and refresh its position (LRU)
   */
  get(key) {
    if (!this.cache.has(key)) return undefined;
    
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  /**
   * Set value in cache with safety wrapper and LRU eviction
   */
  set(key, value) {
    try {
      if (this.cache.has(key)) {
        this.cache.delete(key);
      } else if (this.cache.size >= this.maxSize) {
        // Evict the least recently used (first key in Map)
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, value);
      this.failedKeys.delete(key); // Clear negative cache on successful set
    } catch (err) {
      this.shouldLog(key, 'error', `[CACHE ERROR] Failed to set key "${key}": ${err.message}`);
    }
  }

  /**
   * Get cached value or fetch from DB and store it.
   * Uses promise coalescing, timeout protection, and negative caching.
   */
  async getOrSet(key, fetcher) {
    // 1. Initial LRU check
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    // 2. Negative Caching: Don't hammer DB if it failed recently (10s cooldown)
    const now = Date.now();
    const lastFail = this.failedKeys.get(key) || 0;
    if (now - lastFail < 10000) {
      return null;
    } else if (lastFail !== 0) {
      this.failedKeys.delete(key); // Cleanup expired negative cache entries
    }

    // 3. Promise Coalescing: Avoid redundant inflight requests
    if (this.inflight.has(key)) return this.inflight.get(key);

    const fetchPromise = (async () => {
      let timer = null;
      try {
        // 4. Timeout Protection (5 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("DB Timeout (5s)")), 5000);
        });

        const data = await Promise.race([fetcher(), timeoutPromise]);
        if (timer) clearTimeout(timer);

        if (data !== undefined && data !== null) {
          this.set(key, data);
          return data;
        }
      } catch (err) {
        if (timer) clearTimeout(timer);
        this.shouldLog(key, 'error', `[CACHE ERROR] Data fetch failed for "${key}": ${err.message}`);
        this.failedKeys.set(key, Date.now()); // Mark as failed
        
        // 5. Correct Fallback Logic: Use this.get() to refresh LRU
        const fallback = this.get(key);
        if (fallback !== undefined) {
          this.shouldLog(key, 'warn', `[CACHE WARNING] Falling back to stale data for "${key}" (DB unreachable).`);
          return fallback;
        }
      } finally {
        this.inflight.delete(key);
      }
      
      return null;
    })();

    this.inflight.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Simple log throttler (60s cooldown per key/type)
   */
  shouldLog(key, type, message) {
    const logKey = `${key}:${type}`;
    const now = Date.now();
    const last = this.lastLog.get(logKey) || 0;

    if (now - last > 60000) {
      if (type === 'error') console.error(message);
      if (type === 'warn') console.warn(message);
      this.lastLog.set(logKey, now);
    }
  }

  /**
   * Remove a key from cache (invalidation)
   */
  delete(key) {
    this.cache.delete(key);
    this.inflight.delete(key);
    this.failedKeys.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.inflight.clear();
    this.lastLog.clear();
    this.failedKeys.clear();
  }
}

// Export a singleton instance
module.exports = new Cache();
