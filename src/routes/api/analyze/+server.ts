import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { db, requests, results } from '$lib/server/db/index.js';
import { GitHubService } from '$lib/server/services/github.js';
import { AIAnalyzer } from '$lib/server/services/ai-analyzer.js';
import { CacheService, CACHE_NAMESPACES, CACHE_TTL } from '$lib/server/services/cache.js';
import { analysisRateLimiter } from '$lib/server/services/rate-limiter.js';
import { getRepoForSdk } from '$lib/utils/sdk-mappings.js';
import { ProgressTracker, ANALYSIS_STEPS } from '$lib/server/services/progress-tracker.js';
import type { PullRequest, GitHubPullRequest } from '$lib/types.js';
// Request schema validation
const AnalyzeRequestSchema = z.object({
	requestId: z.string().min(1, 'Request ID is required'),
	sdk: z.string().min(1, 'SDK is required'),
	version: z.string().min(1, 'Version is required'),
	description: z.string().min(10, 'Description must be at least 10 characters')
});

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const cache = new CacheService();
	let githubService: GitHubService | null = null;
	let aiAnalyzer: AIAnalyzer | null = null;

	try {
		// Rate limiting
		const clientIP = getClientAddress();
		const rateLimitResult = analysisRateLimiter.checkLimit(clientIP);

		if (!rateLimitResult.allowed) {
			return new Response('Rate limit exceeded', {
				status: 429,
				headers: {
					'X-RateLimit-Limit': '20',
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
					'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
				}
			});
		}

		const body = await request.json();
		const validatedData = AnalyzeRequestSchema.parse(body);

		// Check for required environment variables
		if (!env.GITHUB_TOKEN) {
			return error(500, 'GitHub token not configured');
		}
		if (!env.OPENAI_API_KEY) {
			return error(500, 'OpenAI API key not configured');
		}

		// Initialize services
		githubService = new GitHubService(env.GITHUB_TOKEN);
		aiAnalyzer = new AIAnalyzer(env.OPENAI_API_KEY);

		// Get repository for SDK
		const repo = getRepoForSdk(validatedData.sdk);

		console.log('xx', { repo, validatedData });

		if (!repo) {
			return error(400, `Unsupported SDK: ${validatedData.sdk}`);
		}

		// Check cache first for complete analysis
		const analysisKey = {
			sdk: validatedData.sdk,
			version: validatedData.version,
			description: validatedData.description
		};

		console.log({ analysisKey });

		const cachedResult = await cache.get(CACHE_NAMESPACES.OPENAI_ANALYSIS, analysisKey);

		console.log({ cachedResult });

		if (cachedResult) {
			const cachedResponse = {
				...cachedResult,
				requestId: null, // No request ID for cached results
				fromCache: true
			};

			return new Response(JSON.stringify(cachedResponse), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'X-RateLimit-Limit': '20',
					'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
					'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
					'X-Cache': 'HIT'
				}
			});
		}

		// Store request in database with client-provided ID
		const requestId = validatedData.requestId;
		await db.insert(requests).values({
			id: requestId,
			sdk: validatedData.sdk,
			version: validatedData.version,
			description: validatedData.description
		});

		// Initialize progress tracking
		const progressTracker = new ProgressTracker(requestId);
		await progressTracker.initialize();

		// Perform analysis with progress tracking
		let analysisResult;
		try {
			analysisResult = await performAnalysis(
				githubService,
				aiAnalyzer,
				cache,
				repo,
				validatedData.sdk,
				validatedData.version,
				validatedData.description,
				progressTracker
			);

			// Mark as completed
			await progressTracker.complete();
		} catch (analysisError) {
			// Mark as failed
			await progressTracker.fail(
				analysisError instanceof Error ? analysisError.message : 'Unknown error'
			);
			throw analysisError;
		}

		// Store result in database
		await db.insert(results).values({
			requestId,
			status: analysisResult.status,
			confidence: analysisResult.confidence,
			summary: analysisResult.summary,
			prs: analysisResult.prs
		});

		// Cache the complete result
		await cache.set(
			CACHE_NAMESPACES.OPENAI_ANALYSIS,
			analysisKey,
			analysisResult,
			CACHE_TTL.OPENAI_ANALYSIS
		);

		// Return response with rate limit headers and request ID for progress tracking
		const responseData = {
			...analysisResult,
			requestId: requestId // Include request ID for progress polling
		};

		return new Response(JSON.stringify(responseData), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'X-RateLimit-Limit': '20',
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
			}
		});
	} catch (err) {
		console.error('Analysis request failed:', err);

		if (err instanceof z.ZodError) {
			return error(
				400,
				'Invalid request data: ' +
					err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
			);
		}

		// Handle specific API errors
		if (err instanceof Error) {
			if (err.message.includes('rate limit')) {
				return error(429, 'GitHub API rate limit exceeded. Please try again later.');
			}
			if (err.message.includes('OpenAI')) {
				return error(503, 'AI analysis service temporarily unavailable.');
			}
		}

		return error(500, 'Internal server error during analysis');
	}
};

/**
 * Perform the complete analysis workflow with real-time progress tracking
 */
async function performAnalysis(
	github: GitHubService,
	ai: AIAnalyzer,
	cache: CacheService,
	repo: string,
	sdk: string,
	version: string,
	description: string,
	progressTracker: ProgressTracker
) {
	try {
		// Step 1: Extract keywords for targeted searching
		await progressTracker.updateStep(
			ANALYSIS_STEPS.EXTRACTING_KEYWORDS.step,
			ANALYSIS_STEPS.EXTRACTING_KEYWORDS.title,
			ANALYSIS_STEPS.EXTRACTING_KEYWORDS.description
		);

		const commitSearchKeywords = await ai.findKeywords(description);
		console.log({ commitSearchKeywords });

		// Update with extracted keywords
		await progressTracker.updateStepWithData(
			ANALYSIS_STEPS.EXTRACTING_KEYWORDS.step,
			ANALYSIS_STEPS.EXTRACTING_KEYWORDS.title,
			'AI extracted search keywords from your issue description',
			{ keywords: commitSearchKeywords }
		);

		// Step 2: Fetch releases
		await progressTracker.updateStep(
			ANALYSIS_STEPS.FETCHING_RELEASES.step,
			ANALYSIS_STEPS.FETCHING_RELEASES.title,
			ANALYSIS_STEPS.FETCHING_RELEASES.description
		);

		// Get all tags/versions for the repository
		let releases = null;
		if (!releases) {
			releases = await github.findAllReleases(repo);
			console.log('xx', releases.length, 'Releases', { releases });
			await cache.set(
				CACHE_NAMESPACES.GITHUB_RELEASES,
				{ repo },
				releases,
				CACHE_TTL.GITHUB_RELEASES
			);
		}

		console.log(
			`found ${releases.length} releases: ${releases[0].tag} - ${releases[releases.length ? releases.length - 1 : 0].tag}`
		);

		// Update with release count
		await progressTracker.updateStepWithData(
			ANALYSIS_STEPS.FETCHING_RELEASES.step,
			ANALYSIS_STEPS.FETCHING_RELEASES.title,
			'Fetched all available releases and version information',
			{ count: releases.length }
		);

		// Step 3: Search for relevant commits
		await progressTracker.updateStep(
			ANALYSIS_STEPS.SEARCHING_COMMITS.step,
			ANALYSIS_STEPS.SEARCHING_COMMITS.title,
			ANALYSIS_STEPS.SEARCHING_COMMITS.description
		);

		// Get ALL commits between user's version and the latest version
		const commitsKey = { repo, from: version };
		let allCommits = undefined;

		if (!allCommits) {
			// Get commits from user's version to the latest (most recent version or HEAD)
			allCommits = await github.getCommitsBetweenVersions(repo, version, commitSearchKeywords);
			await cache.set(
				CACHE_NAMESPACES.GITHUB_COMMITS,
				commitsKey,
				allCommits,
				CACHE_TTL.GITHUB_COMMITS
			);
		}

		console.log(`Found ${allCommits.length} commits to analyze:`);

		// Update with commit count
		await progressTracker.updateStepWithData(
			ANALYSIS_STEPS.SEARCHING_COMMITS.step,
			ANALYSIS_STEPS.SEARCHING_COMMITS.title,
			'Searched repository history for relevant changes',
			{ count: allCommits.length }
		);
		// console.log(allCommits);

		// Step 4: AI analysis of commit messages
		await progressTracker.updateStep(
			ANALYSIS_STEPS.ANALYZING_COMMITS.step,
			ANALYSIS_STEPS.ANALYZING_COMMITS.title,
			ANALYSIS_STEPS.ANALYZING_COMMITS.description
		);

		// PASS 1: AI analysis of ALL commit messages to find potentially relevant ones
		const commitAnalysis = await ai.analyzeCommits(description, allCommits);

		// Update with relevant commit count
		await progressTracker.updateStepWithData(
			ANALYSIS_STEPS.ANALYZING_COMMITS.step,
			ANALYSIS_STEPS.ANALYZING_COMMITS.title,
			'AI evaluated commit messages for potential fixes',
			{ count: commitAnalysis.relevantCommitShas.length, total: allCommits.length }
		);

		if (commitAnalysis.status === 'not_fixed' && !commitAnalysis.relevantCommitShas.length) {
			// No commits found that potentially fix the issue, so we can bail out early
			return {
				status: commitAnalysis.status,
				confidence: commitAnalysis.confidence,
				summary: commitAnalysis.reasoning,
				prs: []
			};
		}

		console.log({ commitAnalysis });

		// Step 3: Extract PR numbers only from relevant commits (identified by AI)
		const relevantCommits = allCommits.filter((commit) =>
			commitAnalysis.relevantCommitShas.includes(commit.sha)
		);

		console.log({ relevantCommits });

		const prNumbers = github.extractPRNumbers(relevantCommits);

		console.log(`Found ${prNumbers.length} PRs to analyze from relevant commits`);

		// Step 5: Fetch PR details for relevant PRs
		await progressTracker.updateStep(
			ANALYSIS_STEPS.FETCHING_PRS.step,
			ANALYSIS_STEPS.FETCHING_PRS.title,
			ANALYSIS_STEPS.FETCHING_PRS.description
		);

		// PASS 2: Fetch PR details for relevant PRs only (smart API usage)
		const prs: PullRequest[] = [];
		for (const prNumber of prNumbers) {
			const prKey = { repo, prNumber };
			let pr = await cache.get<GitHubPullRequest>(CACHE_NAMESPACES.GITHUB_PRS, prKey);

			if (!pr) {
				pr = await github.getPullRequest(repo, prNumber);
				if (pr) {
					await cache.set(CACHE_NAMESPACES.GITHUB_PRS, prKey, pr, CACHE_TTL.GITHUB_PRS);
				}
			}

			if (pr) {
				prs.push({
					title: pr.title,
					url: pr.html_url,
					number: pr.number,
					description: pr.body || undefined,
					mergedAt: pr.merged_at || undefined,
					releaseVersion: github.findReleaseForPr(pr, releases) ?? 'Unknown'
				});
			}
		}

		// PASS 3: AI analysis of fetched PRs
		const prAnalysis = await ai.analyzePullRequests(description, prs);

		console.log(`Found ${prAnalysis.relevantPrNumbers.length} relevant PRs after analysis`);

		// Update with relevant PR count
		await progressTracker.updateStepWithData(
			ANALYSIS_STEPS.FETCHING_PRS.step,
			ANALYSIS_STEPS.FETCHING_PRS.title,
			'Fetched and analyzed pull requests for relevant fixes',
			{ count: prAnalysis.relevantPrNumbers.length, total: prs.length }
		);

		// Step 6: Final AI analysis and combination
		await progressTracker.updateStep(
			ANALYSIS_STEPS.FINAL_ANALYSIS.step,
			ANALYSIS_STEPS.FINAL_ANALYSIS.title,
			ANALYSIS_STEPS.FINAL_ANALYSIS.description
		);

		// Final step: Combine both analyses with weighting
		const analysis = await ai.combineAnalysis(commitAnalysis, prAnalysis, prs);

		return {
			status: analysis.status,
			confidence: analysis.confidence,
			summary: addPrLinksToSummary(analysis.summary, analysis.relevantPrs),
			prs: analysis.relevantPrs
		};
	} catch (err) {
		console.error('Analysis workflow failed:', err);
		throw err;
	}
}

function addPrLinksToSummary(summary: string, prs: PullRequest[]) {
	return summary.replaceAll(/#\d+/g, (match) => {
		const prNumber = match.slice(1);
		const pr = prs.find((pr) => pr.number === parseInt(prNumber));
		if (pr) {
			return `[#${prNumber}](${pr.url})`;
		}
		return match;
	});
}
