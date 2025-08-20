import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGitHubOAuthUrl } from '$lib/server/auth.js';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ url, request }) => {
	// Build the callback URL
	const redirectUri = `${dev ? `http://localhost:${url.port}` : 'https://wtfy.sentry.gg'}/auth/callback`;

	console.log('xx', { redirectUri });
	console.log('xx2', request);

	// Generate GitHub OAuth URL
	const oauthUrl = getGitHubOAuthUrl(redirectUri);

	console.log({ redirectUri, oauthUrl });

	// Redirect to GitHub
	redirect(302, oauthUrl);
};
