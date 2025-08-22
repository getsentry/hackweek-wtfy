import type { PageServerLoad } from './$types';
import { db, requests, results } from '$lib/server/db/index.js';
import { eq, desc, count } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = 25;
		const offset = (page - 1) * limit;

		if (page < 1) {
			throw error(400, 'Page must be a positive number');
		}

		// Get total count of requests
		const [totalResult] = await db.select({ count: count() }).from(requests);

		const totalRequests = totalResult.count;
		const totalPages = Math.ceil(totalRequests / limit);

		// Get paginated requests with their results
		const queriesData = await db
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
			.limit(limit)
			.offset(offset);

		// Transform to the same format as history API
		const queries = queriesData.map((item) => ({
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

		// Ensure proper serialization for SvelteKit
		const serializedQueries = JSON.parse(JSON.stringify(queries));

		return {
			queries: serializedQueries,
			pagination: {
				currentPage: page,
				totalPages,
				totalRequests,
				hasNextPage: page < totalPages,
				hasPreviousPage: page > 1,
				limit
			}
		};
	} catch (err) {
		console.error('Failed to fetch queries:', err);
		throw error(500, 'Failed to load queries');
	}
};
