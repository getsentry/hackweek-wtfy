import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

// Request schema validation
const AnalyzeRequestSchema = z.object({
	sdk: z.string().min(1, 'SDK is required'),
	version: z.string().min(1, 'Version is required'),
	description: z.string().min(10, 'Description must be at least 10 characters')
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate request
		const validatedData = AnalyzeRequestSchema.parse(body);

		// TODO: Phase 2 - Implement the actual analysis logic
		// This is a placeholder response for Phase 1 testing

		// Simulate some processing time
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Mock response based on input for testing
		const mockResponse = {
			status: Math.random() > 0.5 ? ('fixed' as const) : ('not_fixed' as const),
			confidence: Math.floor(Math.random() * 40) + 60, // 60-100% confidence
			summary: `Based on our analysis of ${validatedData.sdk} version ${validatedData.version}, we found ${Math.floor(Math.random() * 3) + 1} potentially relevant changes.`,
			prs: [
				{
					title: 'Fix: Resolve issue with error handling in SDK initialization',
					url: 'https://github.com/getsentry/sentry-javascript/pull/12345',
					number: 12345
				},
				{
					title: 'Improvement: Better error messages for configuration issues',
					url: 'https://github.com/getsentry/sentry-javascript/pull/12346',
					number: 12346
				}
			]
		};

		return json(mockResponse);
	} catch (err) {
		console.error('Analysis request failed:', err);

		if (err instanceof z.ZodError) {
			return error(
				400,
				'Invalid request data: ' +
					err.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
			);
		}

		return error(500, 'Internal server error during analysis');
	}
};
