// Rate limiting service to prevent API abuse and manage quotas
export class RateLimiter {
	private requests: Map<string, { count: number; resetTime: number }> = new Map();
	private maxRequests: number;
	private windowMs: number;

	constructor(maxRequests = 100, windowHours = 1) {
		this.maxRequests = maxRequests;
		this.windowMs = windowHours * 60 * 60 * 1000; // Convert hours to milliseconds
	}

	/**
	 * Check if a request is allowed for the given identifier (IP, user, etc.)
	 */
	checkLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
		const now = Date.now();
		const record = this.requests.get(identifier);

		// No previous requests or window expired
		if (!record || now > record.resetTime) {
			const resetTime = now + this.windowMs;
			this.requests.set(identifier, { count: 1, resetTime });
			return { allowed: true, remaining: this.maxRequests - 1, resetTime };
		}

		// Check if limit exceeded
		if (record.count >= this.maxRequests) {
			return { allowed: false, remaining: 0, resetTime: record.resetTime };
		}

		// Increment count
		record.count++;
		this.requests.set(identifier, record);

		return {
			allowed: true,
			remaining: this.maxRequests - record.count,
			resetTime: record.resetTime
		};
	}

	/**
	 * Clean up expired entries to prevent memory leaks
	 */
	cleanup(): void {
		const now = Date.now();
		for (const [key, record] of this.requests.entries()) {
			if (now > record.resetTime) {
				this.requests.delete(key);
			}
		}
	}

	/**
	 * Get current status for identifier
	 */
	getStatus(identifier: string): { requests: number; remaining: number; resetTime: number } | null {
		const record = this.requests.get(identifier);
		if (!record || Date.now() > record.resetTime) {
			return null;
		}

		return {
			requests: record.count,
			remaining: this.maxRequests - record.count,
			resetTime: record.resetTime
		};
	}

	/**
	 * Reset limit for specific identifier (admin function)
	 */
	reset(identifier: string): void {
		this.requests.delete(identifier);
	}

	/**
	 * Get all active rate limit entries (admin function)
	 */
	getAllEntries(): Array<{ identifier: string; count: number; resetTime: number }> {
		const now = Date.now();
		const entries: Array<{ identifier: string; count: number; resetTime: number }> = [];

		for (const [identifier, record] of this.requests.entries()) {
			if (now <= record.resetTime) {
				entries.push({
					identifier,
					count: record.count,
					resetTime: record.resetTime
				});
			}
		}

		return entries;
	}
}

// Singleton rate limiter instances for different types of limits
export const analysisRateLimiter = new RateLimiter(
	parseInt(process.env.MAX_REQUESTS_PER_HOUR || '20'), // 20 requests per hour by default
	1 // 1 hour window
);

// Cleanup expired entries every 10 minutes
setInterval(
	() => {
		analysisRateLimiter.cleanup();
	},
	10 * 60 * 1000
);
