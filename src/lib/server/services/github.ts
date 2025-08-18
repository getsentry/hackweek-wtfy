// Simplified GitHub API service with better pagination
import { Octokit } from '@octokit/rest';
import { captureException } from '@sentry/sveltekit';
import type { GitHubCommit, GitHubPullRequest, GitHubTag } from '$lib/types';

export class GitHubService {
	private octokit: Octokit;

	constructor(token: string) {
		this.octokit = new Octokit({
			auth: token,
			request: {
				retryAfter: 3 // Retry after 3 seconds on rate limit
			}
		});
	}

	/**
	 * Get all tags/releases for a repository (up to 1000) sorted by creation date (newest first)
	 */
	async getTags(repo: string): Promise<GitHubTag[]> {
		try {
			const [owner, repoName] = repo.split('/');
			const allTags: GitHubTag[] = [];
			let page = 1;
			const perPage = 100; // GitHub API maximum per page
			const maxTags = 1000; // Reasonable limit to avoid excessive API calls

			while (allTags.length < maxTags) {
				const { data } = await this.octokit.repos.listTags({
					owner,
					repo: repoName,
					per_page: perPage,
					page
				});

				// No more tags available
				if (data.length === 0) {
					break;
				}

				const mappedTags = data.map((tag) => ({
					name: tag.name,
					commit: {
						sha: tag.commit.sha
					}
				}));

				allTags.push(...mappedTags);

				// If we got less than perPage, we've reached the end
				if (data.length < perPage) {
					break;
				}

				page++;
			}

			console.log(`Fetched ${allTags.length} tags for ${repo}`);
			return allTags;
		} catch (error) {
			console.error(`Failed to get tags for ${repo}:`, error);
			captureException(error);
			throw new Error(
				`Failed to fetch repository tags: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Get ALL commits between two versions using simple date-based approach
	 */
	async getCommitsBetweenVersions(
		repo: string,
		fromVersion: string,
		toVersion: string,
		commitSearchKeywords: string[]
	): Promise<GitHubCommit[]> {
		try {
			console.log(
				`Looking up ALL commits between versions ${fromVersion} and ${toVersion || 'HEAD'}`
			);
			const [owner, repoName] = repo.split('/');

			// Get the date of the fromVersion
			const fromDate = await this.getVersionDate(owner, repoName, fromVersion);

			// Get ALL commits since that date using pagination
			return this.getAllCommitsSince(owner, repoName, fromDate, toVersion, commitSearchKeywords);
		} catch (error) {
			console.error(
				`Failed to get commits between ${fromVersion} and ${toVersion} for ${repo}:`,
				error
			);
			captureException(error);
			return [];
		}
	}

	/**
	 * Get the commit date for a version tag
	 */
	private async getVersionDate(owner: string, repoName: string, version: string): Promise<string> {
		try {
			// Try different tag formats that repos commonly use
			const tagFormats = [version, `v${version}`, version.replace(/^v/, '')];

			for (const tagFormat of tagFormats) {
				try {
					const tagResponse = await this.octokit.git.getRef({
						owner,
						repo: repoName,
						ref: `tags/${tagFormat}`
					});

					// Get the commit details to extract the date
					const commitResponse = await this.octokit.git.getCommit({
						owner,
						repo: repoName,
						commit_sha: tagResponse.data.object.sha
					});

					console.log(`Found version ${tagFormat} with date ${commitResponse.data.author.date}`);
					return commitResponse.data.author.date;
				} catch (error) {
					// Try next format
					continue;
				}
			}

			throw new Error(`Version tag not found: ${version}`);
		} catch (error) {
			console.error(`Could not get date for version ${version}:`, error);
			// Fallback to a reasonable date (1 year ago) if we can't find the version
			const fallbackDate = new Date();
			fallbackDate.setFullYear(fallbackDate.getFullYear() - 1);
			return fallbackDate.toISOString();
		}
	}

	/**
	 * Get ALL commits since a specific date using proper pagination
	 */
	private async getAllCommitsSince(
		owner: string,
		repoName: string,
		sinceDate: string,
		untilVersion: string,
		commitSearchKeywords: string[]
	): Promise<GitHubCommit[]> {
		const allCommits: GitHubCommit[] = [];
		let page = 1;
		const perPage = 100;

		// If untilVersion is specified, get its SHA to know when to stop
		let untilSha: string | undefined;
		if (untilVersion) {
			try {
				const tagResponse = await this.octokit.git.getRef({
					owner,
					repo: repoName,
					ref: `tags/${untilVersion}`
				});
				untilSha = tagResponse.data.object.sha;
			} catch (error) {
				console.log(`Could not resolve untilVersion ${untilVersion}, will fetch to HEAD`);
			}
		}

		console.log(
			`Fetching ALL commits since ${sinceDate}${untilSha ? ` until ${untilVersion}` : ' to HEAD'}`
		);

		while (true) {
			const { data } = await this.octokit.repos.listCommits({
				owner,
				repo: repoName,
				since: sinceDate,
				sha: untilSha,
				per_page: perPage,
				query: commitSearchKeywords.map((k) => `"${k}"`).join(' OR '),
				page
			});

			if (data.length === 0) {
				break;
			}

			allCommits.push(
				...data.map((commit) => ({
					sha: commit.sha,
					commit: {
						message: commit.commit.message,
						author: {
							date: commit.commit.author?.date || ''
						}
					},
					html_url: commit.html_url
				}))
			);

			// If we got less than perPage, we've reached the end
			if (data.length < perPage) {
				break;
			}

			page++;

			// Very generous safety limit - 1000 pages = 100,000 commits
			if (page > 1000) {
				console.warn(`Reached safety limit (100,000 commits) for ${owner}/${repoName}`);
				break;
			}
		}

		console.log(`Fetched ${allCommits.length} commits since ${sinceDate}`);
		return allCommits;
	}

	/**
	 * Get pull request details by number
	 */
	async getPullRequest(repo: string, prNumber: number): Promise<GitHubPullRequest | null> {
		try {
			const [owner, repoName] = repo.split('/');
			const { data } = await this.octokit.pulls.get({
				owner,
				repo: repoName,
				pull_number: prNumber
			});

			return {
				id: data.id,
				number: data.number,
				title: data.title,
				body: data.body,
				html_url: data.html_url,
				merged_at: data.merged_at,
				merge_commit_sha: data.merge_commit_sha
			};
		} catch (error) {
			console.error(`Failed to get PR #${prNumber} for ${repo}:`, error);
			return null;
		}
	}

	/**
	 * Extract PR numbers from commit messages (e.g., "fix: something (#1234)")
	 */
	extractPRNumbers(commits: GitHubCommit[]): number[] {
		const prNumbers = new Set<number>();

		for (const commit of commits) {
			// Match patterns like (#123), (GH-123), (PR-123)
			const matches = commit.commit.message.match(/\(#?(?:GH-|PR-)?(\d+)\)/gi);
			if (matches) {
				for (const match of matches) {
					const numberMatch = match.match(/(\d+)/);
					if (numberMatch) {
						prNumbers.add(parseInt(numberMatch[1]));
					}
				}
			}
		}

		return Array.from(prNumbers);
	}

	/**
	 * Get version chronology by parsing semantic versions
	 */
	parseVersions(tags: GitHubTag[]): { version: string; sha: string }[] {
		return tags
			.map((tag) => ({
				version: tag.name,
				sha: tag.commit.sha
			}))
			.sort((a, b) => {
				// Basic semantic version comparison
				const aParts = a.version
					.replace(/[^0-9.]/g, '')
					.split('.')
					.map(Number);
				const bParts = b.version
					.replace(/[^0-9.]/g, '')
					.split('.')
					.map(Number);

				for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
					const aPart = aParts[i] || 0;
					const bPart = bParts[i] || 0;
					if (aPart !== bPart) {
						return bPart - aPart; // Descending order (newest first)
					}
				}
				return 0;
			});
	}

	/**
	 * Check current rate limit status
	 */
	async checkRateLimit(): Promise<{ remaining: number; limit: number; resetTime: Date }> {
		const { data } = await this.octokit.rateLimit.get();
		return {
			remaining: data.rate.remaining,
			limit: data.rate.limit,
			resetTime: new Date(data.rate.reset * 1000)
		};
	}
}
