import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { handleErrorWithSentry, sentryHandle } from '@sentry/sveltekit';
import { verifySessionToken } from '$lib/server/auth.js';
import type { Handle } from '@sveltejs/kit';

// Authentication middleware
const authHandle: Handle = async ({ event, resolve }) => {
	const { url, cookies } = event;

	// Public routes that don't require authentication
	const publicRoutes = ['/login', '/auth/login', '/auth/callback', '/_health'];

	// Skip auth for public routes
	if (publicRoutes.some((route) => url.pathname.startsWith(route))) {
		return resolve(event);
	}

	// Check for session cookie
	const sessionToken = cookies.get('session');

	if (!sessionToken) {
		redirect(302, '/login');
	}

	// Verify session token
	const session = verifySessionToken(sessionToken);

	if (!session) {
		// Clear invalid session cookie
		cookies.delete('session', { path: '/' });
		redirect(302, '/login?error=session_expired');
	}

	// Add user to locals for use in routes
	event.locals.user = session.user;
	event.locals.session = session;

	return resolve(event);
};

// Combine Sentry and auth handlers
export const handle = sequence(sentryHandle(), authHandle);

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
