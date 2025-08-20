import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	exchangeCodeForToken,
	getGitHubUser,
	checkOrgMembership,
	createSessionToken
} from '$lib/server/auth.js';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	// Handle OAuth errors
	if (error) {
		console.error('GitHub OAuth error:', error);
		redirect(302, '/?error=oauth_denied');
	}

	if (!code) {
		redirect(302, '/?error=oauth_missing_code');
	}

	// Exchange code for access token
	const accessToken = await exchangeCodeForToken(code);

	// Get user information
	const user = await getGitHubUser(accessToken);

	// Check if user is a member of getsentry organization
	const isMember = await checkOrgMembership(accessToken, user.login);

	if (!isMember) {
		console.log(`Access denied for user ${user.login} - not a getsentry org member`);
		redirect(302, '/?error=access_denied');
	}

	// Create session
	const session = {
		user,
		accessToken,
		expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
	};

	// Create JWT session token
	const sessionToken = createSessionToken(session);

	// Set secure cookie
	cookies.set('session', sessionToken, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});

	console.log(`Successful login for getsentry member: ${user.login}`);

	// Redirect to main app
	redirect(302, '/');
};
