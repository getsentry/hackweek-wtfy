// GitHub API service for fetching repository data
import { Octokit } from '@octokit/rest';
import type { GitHubCommit, GitHubPullRequest, GitHubTag } from '$lib/types';
import { captureException } from '@sentry/sveltekit';

export class GitHubService {
	private octokit: Octokit;
	private rateLimitBuffer = 100; // Keep 100 requests as buffer

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
	 * Get commits between two versions/tags
	 */
	async getCommitsBetweenVersions(
		repo: string,
		fromVersion: string,
		toVersion?: string
	): Promise<GitHubCommit[]> {
		try {
			console.log(`Looking up commits between versions ${fromVersion} and ${toVersion}`);
			const [owner, repoName] = repo.split('/');

			// If no toVersion specified, use the default branch (usually main/master)
			const compareBase = toVersion || (await this.getDefaultBranch(repo));

			// Get the comparison between versions
			const { data } = await this.octokit.repos.compareCommits({
				owner,
				repo: repoName,
				base: fromVersion,
				head: compareBase
			});

			return data.commits.map((commit) => ({
				sha: commit.sha,
				commit: {
					message: commit.commit.message,
					author: {
						date: commit.commit.author?.date || ''
					}
				},
				html_url: commit.html_url
			}));
		} catch (error) {
			console.error(
				`Failed to get commits between ${fromVersion} and ${toVersion} for ${repo}:`,
				error
			);
			captureException(error);
			// Return empty array if comparison fails (e.g., invalid version tags)
			return [];
		}
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
	 * Get commits that reference specific PR numbers
	 */
	async getCommitsForPRs(repo: string, prNumbers: number[]): Promise<GitHubCommit[]> {
		const commits: GitHubCommit[] = [];

		for (const prNumber of prNumbers) {
			try {
				const [owner, repoName] = repo.split('/');
				const { data } = await this.octokit.pulls.listCommits({
					owner,
					repo: repoName,
					pull_number: prNumber
				});

				commits.push(
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
			} catch (error) {
				console.error(`Failed to get commits for PR #${prNumber}:`, error);
				// Continue with other PRs even if one fails
			}
		}

		return commits;
	}

	/**
	 * Search repository for commits containing keywords
	 */
	async searchCommits(repo: string, query: string, since?: string): Promise<GitHubCommit[]> {
		try {
			// GitHub search API has different rate limits, so be careful
			let searchQuery = `repo:${repo} ${query}`;

			// Add date filter if since is provided (format: YYYY-MM-DD)
			if (since) {
				searchQuery += ` committer-date:>=${since}`;
			}

			const { data } = await this.octokit.search.commits({
				q: searchQuery,
				sort: 'committer-date',
				order: 'desc',
				per_page: 50 // Limit to avoid too many results
			});

			return data.items.map((item) => ({
				sha: item.sha,
				commit: {
					message: item.commit.message,
					author: {
						date: item.commit.author.date
					}
				},
				html_url: item.html_url
			}));
		} catch (error) {
			console.error(`Failed to search commits in ${repo} for "${query}":`, error);
			return [];
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
	 * Get the default branch for a repository
	 */
	private async getDefaultBranch(repo: string): Promise<string> {
		try {
			const [owner, repoName] = repo.split('/');
			const { data } = await this.octokit.repos.get({
				owner,
				repo: repoName
			});
			return data.default_branch;
		} catch (error) {
			console.error(`Failed to get default branch for ${repo}:`, error);
			return 'main'; // Fallback to 'main'
		}
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
}
