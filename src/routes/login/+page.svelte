<script lang="ts">
	import { Github, Zap, ShieldCheck, Users } from 'lucide-svelte';
	import { page } from '$app/stores';

	// Get error from URL params
	const error = $derived($page.url.searchParams.get('error'));

	const errorMessages = {
		oauth_denied: 'GitHub OAuth was cancelled or denied.',
		oauth_missing_code: 'Missing authorization code from GitHub.',
		oauth_callback_error: 'Failed to process GitHub OAuth callback.',
		oauth_config_error: 'GitHub OAuth is not configured properly.',
		access_denied: 'Access denied. You must be a member of the getsentry organization.',
		session_expired: 'Your session has expired. Please log in again.'
	};
</script>

<svelte:head>
	<title>Login - WTFY</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-12 sm:px-6 lg:px-8 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
>
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<!-- Logo and Title -->
		<div class="mb-6 flex items-center justify-center">
			<Zap class="mr-3 h-12 w-12 text-indigo-600 dark:text-indigo-400" />
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">WTFY</h1>
				<p class="text-sm text-gray-600 dark:text-gray-400">Was This Fixed Yet?</p>
			</div>
		</div>

		<!-- Login Card -->
		<div
			class="rounded-lg border border-gray-200 bg-white px-4 py-8 shadow-xl sm:px-10 dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="mb-8 text-center">
				<h2 class="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">Welcome to WTFY</h2>
				<p class="text-gray-600 dark:text-gray-400">
					Sign in with your GitHub account to access the internal Sentry tool.
				</p>
			</div>

			<!-- Error Display -->
			{#if error}
				<div
					class="mb-6 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
				>
					<div class="flex">
						<ShieldCheck class="h-5 w-5 flex-shrink-0 text-red-400" />
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800 dark:text-red-200">
								Authentication Error
							</h3>
							<p class="mt-1 text-sm text-red-700 dark:text-red-300">
								{errorMessages[error as keyof typeof errorMessages] || 'An unknown error occurred.'}
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- GitHub Login Button -->
			<div class="flex flex-col items-center space-y-6">
				<a
					href="/auth/login"
					class="flex w-full items-center justify-center rounded-md border border-transparent bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:hover:bg-gray-600"
				>
					<Github class="mr-3 h-5 w-5" />
					Sign in with GitHub
				</a>
				<p class="text-green-600">You don't need to request org access during auth!</p>
			</div>

			<!-- Requirements -->
			<div class="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
				<div class="text-center">
					<div class="mb-3 flex items-center justify-center">
						<Users class="mr-2 h-5 w-5 text-gray-400" />
						<span class="text-sm font-medium text-gray-600 dark:text-gray-400">
							<strong>getsentry</strong> org membership required!
						</span>
					</div>
					<p class="mx-auto max-w-sm text-xs text-gray-500 dark:text-gray-400">
						At the moment, you must be a <strong>public member</strong> of the getsentry GitHub organization
						to access this internal tool.
					</p>
					<p class="mx-auto mt-2 max-w-sm text-xs text-gray-500 dark:text-gray-400">
						Once we get the auth into the getsentry org, we can also authenticate private org
						members.
					</p>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="mt-8 text-center">
			<p class="text-xs text-gray-500 dark:text-gray-400">
				Internal Sentry Tool • Secure GitHub OAuth
			</p>
		</div>
	</div>
</div>
