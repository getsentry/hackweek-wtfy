import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGitHubOAuthUrl } from '$lib/server/auth.js';

export const GET: RequestHandler = async ({ url }) => {
	// Build the callback URL
	const redirectUri = `${url.origin}/auth/callback`;

	// Generate GitHub OAuth URL
	const oauthUrl = getGitHubOAuthUrl(redirectUri);

	console.log({ redirectUri, oauthUrl });

	// Redirect to GitHub
	redirect(302, oauthUrl);
};
