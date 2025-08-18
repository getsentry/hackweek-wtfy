// Caching service for GitHub and OpenAI API responses
import { db, cache } from '../db/index.js';
import { eq, lt } from 'drizzle-orm';
import crypto from 'crypto';

export class CacheService {
	private defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

	constructor(ttlHours?: number) {
		if (ttlHours) {
			this.defaultTTL = ttlHours * 60 * 60 * 1000;
		}
	}

	/**
	 * Generate cache key from request parameters
	 */
	private generateKey(namespace: string, params: Record<string, any>): string {
		const paramString = JSON.stringify(params, Object.keys(params).sort());
		const hash = crypto.createHash('sha256').update(paramString).digest('hex');
		return `${namespace}:${hash}`;
	}

	/**
	 * Store data in cache
	 */
	async set<T>(
		namespace: string,
		params: Record<string, any>,
		data: T,
		ttlMs?: number
	): Promise<void> {
		const key = this.generateKey(namespace, params);
		const expiresAt = new Date(Date.now() + (ttlMs || this.defaultTTL));

		try {
			await db
				.insert(cache)
				.values({
					key,
					data: data as any, // jsonb can store any serializable data
					expiresAt
				})
				.onConflictDoUpdate({
					target: cache.key,
					set: {
						data: data as any,
						expiresAt
					}
				});
		} catch (error) {
			console.error('Failed to store cache entry:', error);
			// Don't throw - caching failure shouldn't break the app
		}
	}

	/**
	 * Retrieve data from cache
	 */
	async get<T>(namespace: string, params: Record<string, any>): Promise<T | null> {
		const key = this.generateKey(namespace, params);

		try {
			const result = await db.select().from(cache).where(eq(cache.key, key)).limit(1);

			if (result.length === 0) {
				return null;
			}

			const entry = result[0];

			// Check if expired
			if (new Date() > entry.expiresAt) {
				// Clean up expired entry
				await this.delete(key);
				return null;
			}

			return entry.data as T;
		} catch (error) {
			console.error('Failed to retrieve cache entry:', error);
			return null;
		}
	}

	/**
	 * Delete specific cache entry
	 */
	private async delete(key: string): Promise<void> {
		try {
			await db.delete(cache).where(eq(cache.key, key));
		} catch (error) {
			console.error('Failed to delete cache entry:', error);
		}
	}

	/**
	 * Clean up expired entries (should be run periodically)
	 */
	async cleanup(): Promise<{ deletedCount: number }> {
		try {
			const result = await db.delete(cache).where(lt(cache.expiresAt, new Date()));

			return { deletedCount: result.count || 0 };
		} catch (error) {
			console.error('Failed to cleanup cache:', error);
			return { deletedCount: 0 };
		}
	}

	/**
	 * Clear all cache entries for a namespace
	 */
	async clearNamespace(namespace: string): Promise<void> {
		try {
			await db.delete(cache).where(eq(cache.key, `${namespace}:%`)); // This is a simplified approach
		} catch (error) {
			console.error('Failed to clear namespace cache:', error);
		}
	}

	/**
	 * Get cache statistics
	 */
	async getStats(): Promise<{
		totalEntries: number;
		expiredEntries: number;
		cacheSize: string;
	}> {
		try {
			const total = await db.select({ count: cache.id }).from(cache);
			const expired = await db
				.select({ count: cache.id })
				.from(cache)
				.where(lt(cache.expiresAt, new Date()));

			return {
				totalEntries: total.length,
				expiredEntries: expired.length,
				cacheSize: `${Math.round(total.length * 0.001)}KB` // Rough estimate
			};
		} catch (error) {
			console.error('Failed to get cache stats:', error);
			return {
				totalEntries: 0,
				expiredEntries: 0,
				cacheSize: '0KB'
			};
		}
	}
}

// Pre-defined cache namespaces for type safety
export const CACHE_NAMESPACES = {
	GITHUB_TAGS: 'github:tags',
	GITHUB_COMMITS: 'github:commits',
	GITHUB_PRS: 'github:prs',
	GITHUB_REPO_INFO: 'github:repo',
	OPENAI_ANALYSIS: 'openai:analysis',
	SDK_VERSIONS: 'sdk:versions'
} as const;

// Cache TTL configurations for different types of data
export const CACHE_TTL = {
	GITHUB_TAGS: 6 * 60 * 60 * 1000, // 6 hours (tags don't change often, but we fetch up to 1000 now)
	GITHUB_COMMITS: 1 * 60 * 60 * 1000, // 1 hour (commits are immutable once created)
	GITHUB_PRS: 30 * 60 * 1000, // 30 minutes (PRs can be updated)
	OPENAI_ANALYSIS: 24 * 60 * 60 * 1000, // 24 hours (analysis shouldn't change much)
	SDK_VERSIONS: 6 * 60 * 60 * 1000 // 6 hours (versions are fairly stable)
} as const;
