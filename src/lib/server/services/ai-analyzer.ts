// OpenAI analysis service for intelligent issue analysis
import OpenAI from 'openai';
import type { AnalysisStatus, GitHubCommit, PullRequest } from '$lib/types';
import * as Sentry from '@sentry/sveltekit';
import * as SentryNode from '@sentry/node';
export class AIAnalyzer {
	private openai: OpenAI;

	constructor(apiKey: string) {
		const originalOpenAi = new OpenAI({
			apiKey
		});
		this.openai = originalOpenAi;
	}

	/**
	 * Extract relevant keywords from issue description for commit searching
	 */
	async findKeywords(issueDescription: string): Promise<string[]> {
		try {
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4.1',
				messages: [
					{
						role: 'system',
						content: `You're a GitHub Search optimizer. 
You'll be given user-created issue descriptions which can be fairly unspecific. 
Your job is to extract 1-5 keywords that we can use to query for commits containing any of these keywords.

Here are some keyword classes you should not return:
- bug, fix, feat, or any other kind of meta information about the issue
- runtime information like server or client
- behaviour like 'working', 'throws error', etc.

Here are some keyword classes you should return:
- the subject of the description, like 'web vitals', 'spans', 'performance', 'memory'

Always return the list of keywords in a JSON array!`
					},
					{
						role: 'user',
						content: `Here's an issue description. Return the list of keywords in a JSON array.

${issueDescription}`
					}
				],
				temperature: 0.3,
				max_tokens: 400
			});

			const keywords = JSON.parse(response.choices[0]?.message?.content || '[]');

			return keywords || [];
		} catch (error) {
			console.error('Keyword extraction failed:', error);
			Sentry.captureException(error);
			return [];
		}
	}

	/**
	 * Extract relevant keywords from issue description for commit searching
	 */
	async summarizeReasoning(originalReasoning: string): Promise<string> {
		try {
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4.1',
				messages: [
					{
						role: 'system',
						content: `You are a sofware engineer. 
	You'll be a text containing potentially repeating information and PR numbers of PRs that might have fixed an issue.
	Your job is to summarize this text, remove duplication and bring it into a readable and easy to understand format.
	Always consider the entire text (${originalReasoning.length} characters) and the context!
	Always return a string!`
					},
					{
						role: 'user',
						content: `Here's the reasoning:\n${originalReasoning}`
					}
				],
				temperature: 0.3,
				max_tokens: 10_000
			});

			const result = response.choices[0]?.message?.content;

			if (!result || !result.length) {
				Sentry.captureException('Summary generation went wrong', {
					extra: {
						originalReasoning
					}
				});
				return 'Error during summary generation';
			}

			return result;
		} catch (error) {
			console.error('Keyword extraction failed:', error);
			Sentry.captureException(error);
			return 'Error during summary generation';
		}
	}

	/**
	 * Analyze commit messages for issue relevance (internal implementation)
	 */
	private async analyzeCommitsInternal(
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
				confidence: 100,
				reasoning: 'No commits found after the specified version.',
				relevantCommitShas: []
			};
		}

		const prompt = this.buildCommitAnalysisPrompt(issueDescription, commits);

		// console.log('prompt', prompt);

		try {
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4.1',
				messages: [
					{
						role: 'system',
						content: `You are an expert software engineer analyzing if commits fix reported issues. 
						You DO NOT stop analyzing before you checked all passed commits!
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
				temperature: 0.7,
				max_tokens: 1500
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
	 * Analyze PR descriptions for issue relevance (internal implementation)
	 */
	private async analyzePullRequestsInternal(
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
				model: 'gpt-4.1',
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
	 * Analyze commit messages for issue relevance (public method for two-pass analysis)
	 * Shards the AI prompts to avoid context loss: I observed AI identifying way less commits
	 * when passed a too long list at once. So we shard the queries to only pass in `COMMITS_PER_AI_PROMPT`
	 * commits at a time.
	 */
	async analyzeCommits(
		issueDescription: string,
		commits: GitHubCommit[]
	): Promise<{
		status: AnalysisStatus;
		confidence: number;
		reasoning: string;
		relevantCommitShas: string[];
	}> {
		const COMMITS_PER_AI_PROMPT = 100;
		const numAnalysisJobs = commits.length / COMMITS_PER_AI_PROMPT;
		const analysisJobs = [];

		for (let i = 0; i < numAnalysisJobs; i++) {
			const startIndex = i * COMMITS_PER_AI_PROMPT;
			const endIndex = startIndex + COMMITS_PER_AI_PROMPT;
			const commitsToAnalyze = commits.slice(startIndex, endIndex);
			if (commitsToAnalyze.length) {
				analysisJobs.push(this.analyzeCommitsInternal(issueDescription, commitsToAnalyze));
			}
		}

		const analysisResults = await Promise.all(analysisJobs);

		return analysisResults.reduce(
			(acc, result, i) => {
				acc.status = acc.status === 'fixed' ? acc.status : result.status;
				acc.confidence = (acc.confidence + result.confidence) / (i + 1);
				acc.reasoning = `${acc.reasoning}\n${result.reasoning}`;
				acc.relevantCommitShas = acc.relevantCommitShas.concat(result.relevantCommitShas);
				return acc;
			},
			{ status: 'unknown', confidence: 0, reasoning: '', relevantCommitShas: [] }
		);
	}

	/**
	 * Analyze PR descriptions for issue relevance (public method for two-pass analysis)
	 * Shards the AI prompts to avoid context loss like in `analyzeCommits`
	 */
	async analyzePullRequests(
		issueDescription: string,
		prs: PullRequest[]
	): Promise<{
		status: AnalysisStatus;
		confidence: number;
		reasoning: string;
		relevantPrNumbers: number[];
	}> {
		const PRS_PER_AI_PROMPT = 5;
		const numAnalysisJobs = prs.length / PRS_PER_AI_PROMPT;
		const analysisJobs = [];

		for (let i = 0; i < numAnalysisJobs; i++) {
			const startIndex = i * PRS_PER_AI_PROMPT;
			const endIndex = startIndex + PRS_PER_AI_PROMPT;
			const prsToAnalyze = prs.slice(startIndex, endIndex);
			if (prsToAnalyze.length) {
				analysisJobs.push(this.analyzePullRequestsInternal(issueDescription, prsToAnalyze));
			}
		}

		const analysisResults = await Promise.all(analysisJobs);

		return analysisResults.reduce(
			(acc, result, i) => {
				acc.status = acc.status === 'fixed' ? acc.status : result.status;
				acc.confidence = (acc.confidence + result.confidence) / (i + 1);
				acc.reasoning = `${acc.reasoning}\n${result.reasoning}`;
				acc.relevantPrNumbers = acc.relevantPrNumbers.concat(result.relevantPrNumbers);
				return acc;
			},
			{ status: 'unknown', confidence: 0, reasoning: '', relevantPrNumbers: [] }
		);
	}

	/**
	 * Combine commit and PR analysis results (public method for two-pass analysis)
	 */
	async combineAnalysis(
		commitAnalysis: {
			status: AnalysisStatus;
			confidence: number;
			reasoning: string;
			relevantCommitShas: string[];
		},
		prAnalysis: {
			status: AnalysisStatus;
			confidence: number;
			reasoning: string;
			relevantPrNumbers: number[];
		},
		allPrs: PullRequest[]
	): Promise<{
		status: AnalysisStatus;
		confidence: number;
		summary: string;
		relevantPrs: PullRequest[];
	}> {
		// Weight PR analysis higher since PRs usually have more context
		const commitWeight = 0.3;
		const prWeight = 0.7;

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
		const summary = await this.generateSummary(
			status,
			commitAnalysis,
			prAnalysis,
			relevantPrs.length
		);

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
		console.log('adding commits to prompt', commits.length);
		// Include ALL commits - AI will handle the analysis properly
		const commitSummary = commits
			.map((commit) => `SHA: ${commit.sha}; Message: ${commit.commit.message.split('\n')[0]};`)
			.join('\n\n');

		return `THINK HARD AND CONSIDER ALL ${commits.length} COMMITS IN THE LIST BELOW. DO NOT STOP BEFORE HAVING LOOKED AT ALL COMMITS!

Analyze if any of these commits appear to fix the described issue. Look for:
- Keywords that match the issue description
- Bug fixes, error handling improvements, or behavior changes
- dependency bumps ARE important and should be considered
- Commits that address similar symptoms or root causes

Consider the ${commits.length} commit messages!

Issue Description:
"${issueDescription}"

Recent Commits:
${commitSummary}
`;
	}

	/**
	 * Build prompt for PR analysis
	 */
	private buildPRAnalysisPrompt(issueDescription: string, prs: PullRequest[]): string {
		// Include ALL relevant PRs (already filtered by first AI pass)
		const prSummary = prs
			.map(
				(pr) =>
					`PR #${pr.number}: ${pr.title}\nDescription: ${(pr.description || '').substring(0, 500)}${(pr.description || '').length > 500 ? '...' : ''}`
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
	private async generateSummary(
		status: AnalysisStatus,
		commitAnalysis: {
			reasoning: string;
		},
		prAnalysis: {
			reasoning: string;
		},
		relevantPrCount: number
	): Promise<string> {
		const minimalAnalysisReasoning = await this.summarizeReasoning(
			prAnalysis.reasoning ?? commitAnalysis.reasoning
		);

		if (status === 'fixed') {
			if (relevantPrCount > 0) {
				return `Found ${relevantPrCount} relevant pull request${relevantPrCount === 1 ? '' : 's'} that likely fix${relevantPrCount === 1 ? 'es' : ''} this issue. ${minimalAnalysisReasoning}`;
			} else {
				return `Found commits that likely fix this issue. ${minimalAnalysisReasoning}`;
			}
		} else if (status === 'not_fixed') {
			return `No clear fixes found for this issue in recent commits or pull requests. The issue may still exist. Consider checking the [latest releases](https://github.com/getsentry/sentry-javascript/releases) manually.`;
		} else {
			return `Unable to determine if this issue has been fixed. ${minimalAnalysisReasoning} You might want to [search the repository](https://github.com/getsentry/sentry-javascript/issues) for similar issues.`;
		}
	}
}
