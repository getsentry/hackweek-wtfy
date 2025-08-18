// API Request/Response types

export interface AnalyzeRequest {
	sdk: string;
	version: string;
	description: string;
}

export interface AnalyzeResponse {
	status: 'fixed' | 'not_fixed' | 'unknown';
	confidence: number;
	summary?: string;
	prs?: PullRequest[];
}

export interface PullRequest {
	title: string;
	url: string;
	number: number;
	mergedAt?: string;
	description?: string;
}

// GitHub API types (subset of what we'll need)
export interface GitHubCommit {
	sha: string;
	commit: {
		message: string;
		author: {
			date: string;
		};
	};
	html_url: string;
}

export interface GitHubPullRequest {
	id: number;
	number: number;
	title: string;
	body: string | null;
	html_url: string;
	merged_at: string | null;
	merge_commit_sha: string | null;
}

export interface GitHubTag {
	name: string;
	commit: {
		sha: string;
	};
}

// Cache types
export interface CacheEntry {
	key: string;
	data: unknown;
	expiresAt: Date;
}

// Analysis result status
export type AnalysisStatus = 'fixed' | 'not_fixed' | 'unknown';

// Error types
export interface ApiError {
	message: string;
	errors?: string[];
}
