// Simplified GitHub API service with better pagination
import { Octokit } from '@octokit/rest';
import * as Sentry from '@sentry/sveltekit';
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
			Sentry.captureException(error);
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

			// Search for commits with keywords since that date
			return this.searchCommitsWithKeywords(repo, commitSearchKeywords, fromDate);
		} catch (error) {
			console.error(
				`Failed to get commits between ${fromVersion} and ${toVersion} for ${repo}:`,
				error
			);
			Sentry.captureException(error);
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
	 * Search for commits containing specific keywords since a date
	 */
	private async searchCommitsWithKeywords(
		repo: string,
		keywords: string[],
		sinceDate: string
	): Promise<GitHubCommit[]> {
		const allMatchingCommits: GitHubCommit[] = [];

		// Search for each keyword separately to get comprehensive results
		for (const keyword of keywords) {
			try {
				const keywordCommits = await this.searchCommits(repo, keyword, sinceDate.split('T')[0]);
				allMatchingCommits.push(...keywordCommits);
			} catch (error) {
				console.error(`Failed to search for keyword "${keyword}":`, error);
				// Continue with other keywords even if one fails
			}
		}

		// Remove duplicates based on SHA
		const uniqueCommits = allMatchingCommits.filter(
			(commit, index, self) => index === self.findIndex((c) => c.sha === commit.sha)
		);

		console.log(
			`Found ${uniqueCommits.length} unique commits matching keywords: ${keywords.join(', ')}`
		);
		return uniqueCommits;
	}

	/**
	 * Search repository for commits containing a specific keyword since a date
	 */
	async searchCommits(repo: string, keyword: string, sinceDate: string): Promise<GitHubCommit[]> {
		const searchQuery = `repo:${repo} committer-date:>${sinceDate} ${keyword}`;
		console.log(`Searching commits with query: ${searchQuery}`);

		// GitHub's Search API often works better unauthenticated for public repos
		try {
			return await Sentry.startSpan(
				{
					op: 'github.search.commits',
					name: `Search commits with query`,
					attributes: {
						searchQuery,
						keyword,
						sinceDate,
						repo
					}
				},
				async (span) => {
					const unauthenticatedOctokit = new Octokit();
					const { data } = await unauthenticatedOctokit.search.commits({
						q: searchQuery,
						sort: 'committer-date',
						order: 'desc',
						per_page: 100
					});

					const commits = data.items.map((item) => ({
						sha: item.sha,
						commit: {
							message: item.commit.message,
							author: {
								date: item.commit.author.date
							}
						},
						html_url: item.html_url
					}));

					const numCommits = commits.length;
					span.setAttribute('numCommits', numCommits);
					console.log(`✅ Unauthenticated search: Found ${numCommits} commits for "${keyword}"`);
					return commits;
				}
			);
		} catch (unauthError) {
			console.error(`❌ Both authenticated and unauthenticated search failed for "${keyword}"`);
			console.error(
				'Auth error:',
				unauthError instanceof Error ? unauthError.message : unauthError
			);
			console.error(
				'Unauth error:',
				unauthError instanceof Error ? unauthError.message : unauthError
			);

			Sentry.captureException(unauthError);
			// Don't throw - return empty array so other keywords can still be searched
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
