import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { db, requests, results } from '$lib/server/db/index.js';
import { GitHubService } from '$lib/server/services/github.js';
import { AIAnalyzer } from '$lib/server/services/ai-analyzer.js';
import { CacheService, CACHE_NAMESPACES, CACHE_TTL } from '$lib/server/services/cache.js';
import { analysisRateLimiter } from '$lib/server/services/rate-limiter.js';
import { getRepoForSdk } from '$lib/utils/sdk-mappings.js';
import type { PullRequest, GitHubTag, GitHubCommit, GitHubPullRequest } from '$lib/types.js';

// Request schema validation
const AnalyzeRequestSchema = z.object({
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
		if (!repo) {
			return error(400, `Unsupported SDK: ${validatedData.sdk}`);
		}

		// Check cache first for complete analysis
		const analysisKey = {
			sdk: validatedData.sdk,
			version: validatedData.version,
			description: validatedData.description
		};

		const cachedResult = await cache.get(CACHE_NAMESPACES.OPENAI_ANALYSIS, analysisKey);
		if (cachedResult) {
			return new Response(JSON.stringify(cachedResult), {
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

		// Store request in database
		const requestResult = await db
			.insert(requests)
			.values({
				sdk: validatedData.sdk,
				version: validatedData.version,
				description: validatedData.description
			})
			.returning();

		const requestId = requestResult[0].id;

		// Perform analysis
		const analysisResult = await performAnalysis(
			githubService,
			aiAnalyzer,
			cache,
			repo,
			validatedData.sdk,
			validatedData.version,
			validatedData.description
		);

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

		// Return response with rate limit headers
		return new Response(JSON.stringify(analysisResult), {
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
 * Perform the complete analysis workflow
 */
async function performAnalysis(
	github: GitHubService,
	ai: AIAnalyzer,
	cache: CacheService,
	repo: string,
	sdk: string,
	version: string,
	description: string
) {
	try {
		// Step 1: Get all tags/versions for the repository
		let tags = await cache.get<GitHubTag[]>(CACHE_NAMESPACES.GITHUB_TAGS, { repo });
		if (!tags) {
			tags = await github.getTags(repo);
			await cache.set(CACHE_NAMESPACES.GITHUB_TAGS, { repo }, tags, CACHE_TTL.GITHUB_TAGS);
		}

		// Step 2: Parse and sort versions to find newer versions
		const sortedVersions = github.parseVersions(tags);
		const userVersionIndex = sortedVersions.findIndex(
			(v) => v.version.includes(version) || version.includes(v.version.replace(/[^0-9.]/g, ''))
		);

		if (userVersionIndex === -1) {
			return {
				status: 'unknown' as const,
				confidence: 30,
				summary: `Version ${version} not found in repository tags. Please check the version number.`,
				prs: []
			};
		}

		// Get commits between user's version and newer versions (limit to 3 newer versions to avoid too much data)
		const newerVersions = sortedVersions.slice(0, Math.min(userVersionIndex, 3));
		let allCommits: GitHubCommit[] = [];

		for (const newerVersion of newerVersions) {
			const commitsKey = { repo, from: version, to: newerVersion.version };
			let commits = await cache.get<GitHubCommit[]>(CACHE_NAMESPACES.GITHUB_COMMITS, commitsKey);

			if (!commits) {
				commits = await github.getCommitsBetweenVersions(repo, version, newerVersion.version);
				await cache.set(
					CACHE_NAMESPACES.GITHUB_COMMITS,
					commitsKey,
					commits,
					CACHE_TTL.GITHUB_COMMITS
				);
			}

			allCommits.push(...commits);
		}

		// If no newer versions, check commits since the user's version
		if (newerVersions.length === 0) {
			const commitsKey = { repo, from: version };
			let recentCommits = await cache.get<GitHubCommit[]>(
				CACHE_NAMESPACES.GITHUB_COMMITS,
				commitsKey
			);

			if (!recentCommits) {
				recentCommits = await github.getCommitsBetweenVersions(repo, version);
				await cache.set(
					CACHE_NAMESPACES.GITHUB_COMMITS,
					commitsKey,
					recentCommits,
					CACHE_TTL.GITHUB_COMMITS
				);
			}

			allCommits = recentCommits || [];
		}

		// Step 3: Extract PR numbers from commits
		const prNumbers = github.extractPRNumbers(allCommits);

		// Step 4: Get PR details
		const prs: PullRequest[] = [];
		for (const prNumber of prNumbers.slice(0, 10)) {
			// Limit to 10 PRs to avoid too many API calls
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
					mergedAt: pr.merged_at || undefined
				});
			}
		}

		// Step 5: Use AI to analyze relevance
		const analysis = await ai.analyzeRelevance(description, allCommits, prs);

		return {
			status: analysis.status,
			confidence: analysis.confidence,
			summary: analysis.summary,
			prs: analysis.relevantPrs
		};
	} catch (err) {
		console.error('Analysis workflow failed:', err);
		throw err;
	}
}
