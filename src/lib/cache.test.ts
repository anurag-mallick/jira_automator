import { describe, it, expect, vi, beforeEach } from 'vitest';
import cache from './cache';

describe('Cache', () => {
  beforeEach(() => {
    cache.clear();
    vi.clearAllMocks();
  });

  it('should initialize cache', () => {
    expect(cache).toBeDefined();
  });

  it('should set and get values', () => {
    const testKey = 'test-key';
    const testValue = { data: 'test' };

    const setResult = cache.set(testKey, testValue);
    expect(setResult).toBe(true);

    const retrievedValue = cache.get(testKey);
    expect(retrievedValue).toEqual(testValue);
  });

  it('should return undefined for non-existent keys', () => {
    const nonExistentValue = cache.get('non-existent-key');
    expect(nonExistentValue).toBeUndefined();
  });

  it('should delete values', () => {
    const testKey = 'delete-test-key';
    cache.set(testKey, { data: 'to-be-deleted' });

    const deleteCount = cache.delete(testKey);
    expect(deleteCount).toBe(1);

    const deletedValue = cache.get(testKey);
    expect(deletedValue).toBeUndefined();
  });

  it('should clear all cache', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });

    cache.clear();

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  it('should handle cache wrap functionality', async () => {
    const testKey = 'wrap-test-key';
    const testValue = { data: 'wrapped-value' };

    // First call should execute the function and cache the result
    const firstResult = await cache.wrap(testKey, async () => {
      return testValue;
    });

    expect(firstResult).toEqual(testValue);

    // Second call should return cached value without executing the function
    const secondResult = await cache.wrap(testKey, async () => {
      return { data: 'this-should-not-be-returned' };
    });

    expect(secondResult).toEqual(testValue);
  });

  it('should handle cache with custom TTL', () => {
    const testKey = 'ttl-test-key';
    const testValue = { data: 'ttl-value' };

    const setResult = cache.set(testKey, testValue, { ttl: 1 }); // 1 second TTL
    expect(setResult).toBe(true);

    const immediateValue = cache.get(testKey);
    expect(immediateValue).toEqual(testValue);
  });

  it('should provide cache stats', () => {
    const stats = cache.getStats();
    expect(stats).toBeDefined();
    expect(stats.enabled).toBe(true);
  });
});

describe('Cache Error Handling', () => {
  it('should handle errors gracefully when cache is disabled', () => {
    // Mock disabled cache
    const originalEnabled = cache['enabled'];
    cache['enabled'] = false;

    expect(cache.set('test', { data: 'test' })).toBe(false);
    expect(cache.get('test')).toBeUndefined();
    expect(cache.delete('test')).toBe(0);

    // Restore original state
    cache['enabled'] = originalEnabled;
  });
});