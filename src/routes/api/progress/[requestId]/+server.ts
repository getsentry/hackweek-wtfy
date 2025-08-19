import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ProgressTracker } from '$lib/server/services/progress-tracker.js';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const requestId = parseInt(params.requestId);

		if (isNaN(requestId)) {
			return error(400, 'Invalid request ID');
		}

		const progressData = await ProgressTracker.getProgress(requestId);

		if (!progressData) {
			return error(404, 'Progress not found');
		}

		// Transform to a clean format for the frontend
		const progressResponse = {
			requestId: progressData.requestId,
			currentStep: progressData.currentStep,
			totalSteps: progressData.totalSteps,
			stepTitle: progressData.stepTitle,
			stepDescription: progressData.stepDescription,
			isCompleted: progressData.isCompleted === 1,
			error: progressData.error,
			updatedAt: progressData.updatedAt
		};

		return json(progressResponse);
	} catch (err) {
		console.error('Failed to get progress:', err);
		return error(500, 'Failed to get progress');
	}
};
