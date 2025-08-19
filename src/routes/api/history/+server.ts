import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, requests, results } from '$lib/server/db/index.js';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		// Get the last 10 requests with their results
		const recentRequests = await db
			.select({
				id: requests.id,
				sdk: requests.sdk,
				version: requests.version,
				description: requests.description,
				createdAt: requests.createdAt,
				// Result fields
				status: results.status,
				confidence: results.confidence,
				summary: results.summary,
				prs: results.prs
			})
			.from(requests)
			.leftJoin(results, eq(requests.id, results.requestId))
			.orderBy(desc(requests.createdAt))
			.limit(10);

		// Transform to a cleaner format
		const historyItems = recentRequests.map((item) => ({
			id: item.id,
			sdk: item.sdk,
			version: item.version,
			description: item.description,
			createdAt: item.createdAt,
			result: item.status
				? {
						status: item.status,
						confidence: item.confidence,
						summary: item.summary,
						prs: item.prs
					}
				: null
		}));

		return json(historyItems);
	} catch (error) {
		console.error('Failed to fetch request history:', error);
		return json({ error: 'Failed to fetch request history' }, { status: 500 });
	}
};
