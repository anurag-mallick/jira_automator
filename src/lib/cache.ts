import NodeCache from 'node-cache';
import { log } from './logger';

interface CacheOptions {
  ttl?: number;
  keys?: boolean;
  useClones?: boolean;
}

class AppCache {
  private cache: NodeCache;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.CACHE_ENABLED !== 'false';
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes default
      checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD || '600'), // 10 minutes
      useClones: false,
      deleteOnExpire: true
    });

    log.info('Cache initialized', {
      enabled: this.enabled,
      ttl: process.env.CACHE_TTL || '300',
      checkPeriod: process.env.CACHE_CHECK_PERIOD || '600'
    });
  }

  public set<T>(key: string, value: T, options: CacheOptions = {}): boolean {
    if (!this.enabled) return false;

    try {
      const success = this.cache.set(key, value, options.ttl);
      if (success) {
        log.debug('Cache set', { key, ttl: options.ttl });
      }
      return success;
    } catch (error: any) {
      log.error('Cache set failed', { key, error: error.message });
      return false;
    }
  }

  public get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

    try {
      const value = this.cache.get<T>(key);
      if (value !== undefined) {
        log.debug('Cache hit', { key });
      } else {
        log.debug('Cache miss', { key });
      }
      return value;
    } catch (error: any) {
      log.error('Cache get failed', { key, error: error.message });
      return undefined;
    }
  }

  public delete(key: string): number {
    if (!this.enabled) return 0;

    try {
      const count = this.cache.del(key);
      log.debug('Cache deleted', { key, count });
      return count;
    } catch (error: any) {
      log.error('Cache delete failed', { key, error: error.message });
      return 0;
    }
  }

  public clear(): void {
    if (!this.enabled) return;

    try {
      this.cache.flushAll();
      log.info('Cache cleared');
    } catch (error: any) {
      log.error('Cache clear failed', { error: error.message });
    }
  }

  public getStats(): any {
    if (!this.enabled) return { enabled: false };

    return {
      enabled: true,
      keys: this.cache.keys(),
      stats: this.cache.getStats()
    };
  }

  public wrap<T>(key: string, fn: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    if (!this.enabled) return fn();

    const cachedValue = this.get<T>(key);
    if (cachedValue !== undefined) {
      return Promise.resolve(cachedValue);
    }

    return fn().then(value => {
      this.set(key, value, options);
      return value;
    });
  }
}

// Singleton instance
const cache = new AppCache();
export default cache;