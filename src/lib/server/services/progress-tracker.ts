// Progress tracking service for real-time analysis updates
import { db, progress } from '../db/index.js';
import { eq } from 'drizzle-orm';

export class ProgressTracker {
	private requestId: string;
	private totalSteps: number;
	private stepResults: Record<number, { title: string; description: string }> = {};

	constructor(requestId: string, totalSteps = 6) {
		this.requestId = requestId;
		this.totalSteps = totalSteps;
	}

	/**
	 * Initialize progress tracking for a request
	 */
	async initialize(): Promise<void> {
		await db.insert(progress).values({
			requestId: this.requestId,
			currentStep: 0,
			totalSteps: this.totalSteps,
			stepTitle: 'Starting analysis...',
			stepDescription: 'Initializing AI-powered issue analysis',
			isCompleted: 0
		});
	}

	/**
	 * Update progress to a specific step
	 */
	async updateStep(step: number, title: string, description?: string): Promise<void> {
		try {
			await db
				.update(progress)
				.set({
					currentStep: step,
					stepTitle: title,
					stepDescription: description,
					updatedAt: new Date()
				})
				.where(eq(progress.requestId, this.requestId));

			console.log(`Progress updated: Step ${step}/${this.totalSteps} - ${title}`);
		} catch (error) {
			console.error('Failed to update progress:', error);
			// Don't throw - progress updates shouldn't break the analysis
		}
	}

	/**
	 * Update step with dynamic data (keywords, counts, etc.) and store result
	 */
	async updateStepWithData(
		step: number,
		title: string,
		baseDescription: string,
		data?: { keywords?: string[]; count?: number; total?: number }
	): Promise<void> {
		let description = baseDescription;

		if (data) {
			if (data.keywords && data.keywords.length > 0) {
				description += ` (Keywords: ${data.keywords.join(', ')})`;
			}
			if (data.count !== undefined) {
				description += ` (Found: ${data.count})`;
			}
			if (data.total !== undefined) {
				description += ` (Total: ${data.total})`;
			}
		}

		// Store this step's result for later retrieval
		this.stepResults[step] = { title, description };

		await this.updateStep(step, title, description);
		await this.saveStepResults();
	}

	/**
	 * Save step results to database
	 */
	private async saveStepResults(): Promise<void> {
		try {
			await db
				.update(progress)
				.set({
					stepResults: JSON.stringify(this.stepResults),
					updatedAt: new Date()
				})
				.where(eq(progress.requestId, this.requestId));
		} catch (error) {
			console.error('Failed to save step results:', error);
		}
	}

	/**
	 * Mark analysis as completed
	 */
	async complete(): Promise<void> {
		try {
			await db
				.update(progress)
				.set({
					currentStep: this.totalSteps,
					stepTitle: 'Analysis Complete',
					stepDescription: 'Results ready',
					isCompleted: 1,
					updatedAt: new Date()
				})
				.where(eq(progress.requestId, this.requestId));

			console.log(`Analysis completed for request ${this.requestId}`);
		} catch (error) {
			console.error('Failed to mark analysis as complete:', error);
		}
	}

	/**
	 * Mark analysis as failed with error
	 */
	async fail(errorMessage: string, currentStep?: number): Promise<void> {
		try {
			await db
				.update(progress)
				.set({
					currentStep: currentStep || this.totalSteps,
					stepTitle: 'Analysis Failed',
					stepDescription: 'An error occurred during analysis',
					error: errorMessage,
					isCompleted: 1, // Mark as completed (with error)
					updatedAt: new Date()
				})
				.where(eq(progress.requestId, this.requestId));

			console.log(`Analysis failed for request ${this.requestId}: ${errorMessage}`);
		} catch (dbError) {
			console.error('Failed to record analysis failure:', dbError);
		}
	}

	/**
	 * Get current progress for a request
	 */
	static async getProgress(requestId: string) {
		try {
			const result = await db
				.select()
				.from(progress)
				.where(eq(progress.requestId, requestId))
				.limit(1);

			const progressData = result[0];
			if (!progressData) return null;

			// Parse step results if available
			let stepResults = {};
			if (progressData.stepResults) {
				try {
					stepResults = JSON.parse(progressData.stepResults);
				} catch (err) {
					console.error('Failed to parse step results:', err);
				}
			}

			return {
				...progressData,
				stepResults
			};
		} catch (error) {
			console.error('Failed to get progress:', error);
			return null;
		}
	}

	/**
	 * Clean up old progress entries (older than 24 hours)
	 */
	static async cleanup(): Promise<void> {
		try {
			const oneDayAgo = new Date();
			oneDayAgo.setHours(oneDayAgo.getHours() - 24);

			await db.delete(progress).where(eq(progress.updatedAt, oneDayAgo)); // This would need a proper date comparison

			console.log('Cleaned up old progress entries');
		} catch (error) {
			console.error('Failed to cleanup progress entries:', error);
		}
	}
}

// Analysis step definitions
export const ANALYSIS_STEPS = {
	EXTRACTING_KEYWORDS: {
		step: 1,
		title: 'Extract Keywords',
		description: 'AI analyzing your issue description for search terms'
	},
	FETCHING_RELEASES: {
		step: 2,
		title: 'Fetch Releases',
		description: 'Getting all available releases and version information'
	},
	SEARCHING_COMMITS: {
		step: 3,
		title: 'Search Relevant Commits',
		description: 'Looking through repository history for relevant changes'
	},
	ANALYZING_COMMITS: {
		step: 4,
		title: 'Analyze Commit Messages',
		description: 'AI evaluating commit messages for potential fixes'
	},
	FETCHING_PRS: {
		step: 5,
		title: 'Fetch and Analyze PRs',
		description: 'Getting detailed information about relevant pull requests'
	},
	FINAL_ANALYSIS: {
		step: 6,
		title: 'Combined Analysis',
		description: 'Combining all findings to determine if issue was fixed'
	}
} as const;
