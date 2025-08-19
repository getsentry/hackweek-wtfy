import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';

export const GET: RequestHandler = async () => {
	try {
		// Test database connection
		await db.execute('SELECT 1');

		return json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			version: '0.0.1',
			service: 'wtfy'
		});
	} catch (error) {
		console.error('Health check failed:', error);

		return json(
			{
				status: 'error',
				timestamp: new Date().toISOString(),
				error: 'Database connection failed'
			},
			{ status: 503 }
		);
	}
};
