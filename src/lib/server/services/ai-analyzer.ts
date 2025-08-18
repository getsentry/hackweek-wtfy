// OpenAI analysis service for intelligent issue analysis
import OpenAI from 'openai';
import type { AnalysisStatus, GitHubCommit, PullRequest } from '$lib/types';

export class AIAnalyzer {
	private openai: OpenAI;

	constructor(apiKey: string) {
		this.openai = new OpenAI({
			apiKey
		});
	}

	/**
	 * Analyze if commits/PRs are related to the user's issue description
	 */
	async analyzeRelevance(
		issueDescription: string,
		commits: GitHubCommit[],
		prs: PullRequest[]
	): Promise<{
		status: AnalysisStatus;
		confidence: number;
		summary: string;
		relevantPrs: PullRequest[];
	}> {
		try {
			// If no commits or PRs to analyze, return unknown status
			if (commits.length === 0 && prs.length === 0) {
				return {
					status: 'unknown',
					confidence: 20,
					summary: 'No commits or pull requests found for analysis.',
					relevantPrs: []
				};
			}

			// Analyze commits first for quick wins
			const commitAnalysis = await this.analyzeCommits(issueDescription, commits);

			// Analyze PRs for more detailed context
			const prAnalysis = await this.analyzePullRequests(issueDescription, prs);

			// Combine analysis results
			const combinedResult = this.combineAnalysis(commitAnalysis, prAnalysis, prs);

			return combinedResult;
		} catch (error) {
			console.error('AI analysis failed:', error);
			return {
				status: 'unknown',
				confidence: 10,
				summary: 'AI analysis failed due to an error.',
				relevantPrs: []
			};
		}
	}

	/**
	 * Analyze commit messages for issue relevance
	 */
	private async analyzeCommits(
		issueDescription: string,
		commits: GitHubCommit[]
	): Promise<{
		status: AnalysisStatus;
		confidence: number;
		reasoning: string;
		relevantCommitShas: string[];
	}> {
		if (commits.length === 0) {
			return {
				status: 'not_fixed',
				confidence: 60,
				reasoning: 'No commits found after the specified version.',
				relevantCommitShas: []
			};
		}

		const prompt = this.buildCommitAnalysisPrompt(issueDescription, commits);

		try {
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4',
				messages: [
					{
						role: 'system',
						content: `You are an expert software engineer analyzing if commits fix reported issues. 
						Respond with a JSON object containing:
						- status: "fixed", "not_fixed", or "unknown"
						- confidence: number from 0-100
						- reasoning: brief explanation
						- relevantCommitShas: array of commit SHAs that seem relevant`
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.3,
				max_tokens: 800
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error('No response from OpenAI');
			}

			const analysis = JSON.parse(content);
			return {
				status: analysis.status || 'unknown',
				confidence: Math.min(100, Math.max(0, analysis.confidence || 0)),
				reasoning: analysis.reasoning || 'No reasoning provided',
				relevantCommitShas: analysis.relevantCommitShas || []
			};
		} catch (error) {
			console.error('Commit analysis failed:', error);
			return {
				status: 'unknown',
				confidence: 20,
				reasoning: 'Analysis failed due to parsing error',
				relevantCommitShas: []
			};
		}
	}

	/**
	 * Analyze PR descriptions for issue relevance
	 */
	private async analyzePullRequests(
		issueDescription: string,
		prs: PullRequest[]
	): Promise<{
		status: AnalysisStatus;
		confidence: number;
		reasoning: string;
		relevantPrNumbers: number[];
	}> {
		if (prs.length === 0) {
			return {
				status: 'unknown',
				confidence: 40,
				reasoning: 'No pull requests available for analysis.',
				relevantPrNumbers: []
			};
		}

		const prompt = this.buildPRAnalysisPrompt(issueDescription, prs);

		try {
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4',
				messages: [
					{
						role: 'system',
						content: `You are an expert software engineer analyzing if pull requests fix reported issues.
						Focus on PR titles and descriptions to determine relevance.
						Respond with a JSON object containing:
						- status: "fixed", "not_fixed", or "unknown"
						- confidence: number from 0-100  
						- reasoning: brief explanation
						- relevantPrNumbers: array of PR numbers that seem relevant`
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.3,
				max_tokens: 800
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error('No response from OpenAI');
			}

			const analysis = JSON.parse(content);
			return {
				status: analysis.status || 'unknown',
				confidence: Math.min(100, Math.max(0, analysis.confidence || 0)),
				reasoning: analysis.reasoning || 'No reasoning provided',
				relevantPrNumbers: analysis.relevantPrNumbers || []
			};
		} catch (error) {
			console.error('PR analysis failed:', error);
			return {
				status: 'unknown',
				confidence: 20,
				reasoning: 'Analysis failed due to parsing error',
				relevantPrNumbers: []
			};
		}
	}

	/**
	 * Combine commit and PR analysis results
	 */
	private combineAnalysis(
		commitAnalysis: any,
		prAnalysis: any,
		allPrs: PullRequest[]
	): {
		status: AnalysisStatus;
		confidence: number;
		summary: string;
		relevantPrs: PullRequest[];
	} {
		// Weight PR analysis higher since PRs usually have more context
		const commitWeight = 0.4;
		const prWeight = 0.6;

		const combinedConfidence = Math.round(
			commitAnalysis.confidence * commitWeight + prAnalysis.confidence * prWeight
		);

		// Determine overall status (prefer 'fixed' if either analysis suggests it's fixed)
		let status: AnalysisStatus = 'unknown';
		if (commitAnalysis.status === 'fixed' || prAnalysis.status === 'fixed') {
			status = 'fixed';
		} else if (commitAnalysis.status === 'not_fixed' && prAnalysis.status === 'not_fixed') {
			status = 'not_fixed';
		}

		// Get relevant PRs
		const relevantPrs = allPrs.filter((pr) => prAnalysis.relevantPrNumbers.includes(pr.number));

		// Generate summary
		const summary = this.generateSummary(status, commitAnalysis, prAnalysis, relevantPrs.length);

		return {
			status,
			confidence: combinedConfidence,
			summary,
			relevantPrs
		};
	}

	/**
	 * Build prompt for commit analysis
	 */
	private buildCommitAnalysisPrompt(issueDescription: string, commits: GitHubCommit[]): string {
		const commitSummary = commits
			.slice(0, 20)
			.map(
				(
					commit // Limit to avoid token limits
				) =>
					`SHA: ${commit.sha.substring(0, 8)}\nMessage: ${commit.commit.message}\nDate: ${commit.commit.author.date}`
			)
			.join('\n\n');

		return `
Issue Description:
"${issueDescription}"

Recent Commits:
${commitSummary}

Analyze if any of these commits appear to fix the described issue. Look for:
- Keywords that match the issue description
- Bug fixes, error handling improvements, or behavior changes
- Commits that address similar symptoms or root causes

Consider the commit messages, timing, and context.`;
	}

	/**
	 * Build prompt for PR analysis
	 */
	private buildPRAnalysisPrompt(issueDescription: string, prs: PullRequest[]): string {
		const prSummary = prs
			.slice(0, 10)
			.map(
				(
					pr // Limit to avoid token limits
				) =>
					`PR #${pr.number}: ${pr.title}\nDescription: ${(pr.description || '').substring(0, 300)}${(pr.description || '').length > 300 ? '...' : ''}`
			)
			.join('\n\n');

		return `
Issue Description:
"${issueDescription}"

Pull Requests:
${prSummary}

Analyze if any of these pull requests appear to fix the described issue. Look for:
- PR titles that indicate bug fixes or improvements related to the issue
- PR descriptions that mention similar symptoms or solutions
- Changes that would address the root cause of the reported issue

Focus on the titles and descriptions to determine relevance.`;
	}

	/**
	 * Generate human-readable summary
	 */
	private generateSummary(
		status: AnalysisStatus,
		commitAnalysis: any,
		prAnalysis: any,
		relevantPrCount: number
	): string {
		if (status === 'fixed') {
			if (relevantPrCount > 0) {
				return `Found ${relevantPrCount} relevant pull request${relevantPrCount === 1 ? '' : 's'} that likely fix${relevantPrCount === 1 ? 'es' : ''} this issue. ${prAnalysis.reasoning}`;
			} else {
				return `Found commits that likely fix this issue. ${commitAnalysis.reasoning}`;
			}
		} else if (status === 'not_fixed') {
			return `No clear fixes found for this issue in recent commits or pull requests. The issue may still exist.`;
		} else {
			return `Unable to determine if this issue has been fixed. ${commitAnalysis.reasoning || prAnalysis.reasoning}`;
		}
	}
}
