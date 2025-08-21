// Lightweight GitHub OAuth implementation
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
import { Octokit } from '@octokit/rest';

export interface GitHubUser {
	id: number;
	login: string;
	avatar_url: string;
	name: string;
	email: string;
}

export interface AuthSession {
	user: GitHubUser;
	accessToken: string;
	expiresAt: number;
}

/**
 * Exchange GitHub OAuth code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
	const clientId = env.GITHUB_CLIENT_ID ?? env.GITHUB_CLIENT_ID_LOCAL_DEV;
	const clientSecret = env.GITHUB_CLIENT_SECRET ?? env.GITHUB_CLIENT_SECRET_LOCAL_DEV;

	if (!clientId || !clientSecret) {
		throw new Error('GitHub OAuth not configured');
	}

	const response = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			code
		})
	});

	const data = await response.json();

	if (data.error) {
		throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
	}

	return data.access_token;
}

/**
 * Get GitHub user info using access token
 */
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
	const response = await fetch('https://api.github.com/user', {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/vnd.github.v3+json'
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to get user info: ${response.statusText}`);
	}

	return response.json();
}

/**
 * Check if user is a member of the getsentry organization
 */
export async function checkOrgMembership(accessToken: string, username: string): Promise<boolean> {
	try {
		const octokit = new Octokit({ auth: accessToken });

		const orgsResponse = await octokit.orgs.listForUser({ username });
		const orgs = orgsResponse.data.map((org) => org.login);

		// Check if user is a member of 'getsentry'
		if (!orgs.includes('getsentry')) {
			console.error(`User ${username} is not a member of getsentry org`);
			return false;
		}

		return orgsResponse.status === 200;
	} catch (error) {
		console.error('Failed to check org membership:', error);
		return false;
	}
}

/**
 * Create JWT session token
 */
export function createSessionToken(session: AuthSession): string {
	const secret = env.JWT_SECRET || 'dev-secret-change-in-production';

	return jwt.sign(session, secret, {
		expiresIn: '7d' // Session expires in 7 days
	});
}

/**
 * Verify and decode JWT session token
 */
export function verifySessionToken(token: string): AuthSession | null {
	try {
		const secret = env.JWT_SECRET || 'dev-secret-change-in-production';
		const decoded = jwt.verify(token, secret) as AuthSession;

		// Check if session is expired
		if (Date.now() > decoded.expiresAt) {
			return null;
		}

		return decoded;
	} catch (error) {
		console.error('Invalid session token:', error);
		return null;
	}
}

/**
 * Generate GitHub OAuth login URL
 */
export function getGitHubOAuthUrl(redirectUri: string): string {
	const clientId = env.GITHUB_CLIENT_ID ?? env.GITHUB_CLIENT_ID_LOCAL_DEV;

	if (!clientId) {
		throw new Error('GITHUB_CLIENT_ID not configured');
	}

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: 'read:user user:email read:org',
		state: generateRandomState()
	});

	return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Generate random state for OAuth security
 */
function generateRandomState(): string {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
