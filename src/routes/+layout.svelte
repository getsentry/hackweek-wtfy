<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Github, HelpCircle } from 'lucide-svelte';
	import * as Sentry from '@sentry/sveltekit';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { children, data } = $props();

	const user = data.user;
	const nav = $derived($page);
	const routeId = $derived(nav.route.id);

	$effect(() => {
		if (routeId !== '/login' && browser && !user) {
			goto('/login');
		}
	});

	if (browser && user) {
		Sentry.setUser({ username: user.name, email: user.email, id: user.id });
	}
</script>

<svelte:head>
	<title>WTFY - Was This Fixed Yet?</title>
	<meta
		name="description"
		content="Internal Sentry tool to check if SDK issues were fixed in newer versions"
	/>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center space-x-8">
					<a
						href={routeId === '/login' ? routeId : '/'}
						class="cursor-pointer text-xl font-semibold text-gray-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
					>
						WTFY
					</a>
					{#if user}
						<a
							href="/how-it-works"
							class="flex cursor-pointer items-center space-x-1 text-sm text-gray-600 transition-colors hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
						>
							<HelpCircle class="h-4 w-4" />
							<span>How It Works</span>
						</a>
					{/if}
				</div>
				<div class="flex items-center space-x-4">
					<!-- User Info (if available) -->
					{#if $page.data?.user}
						<div class="flex items-center space-x-3">
							<img
								src={$page.data.user.avatar_url}
								alt={$page.data.user.name || $page.data.user.login}
								class="h-8 w-8 rounded-full border border-gray-300 dark:border-gray-600"
							/>
							<form action="/auth/logout" method="post" class="hidden flex-col items-start sm:flex">
								<p class="text-sm font-medium text-gray-900 dark:text-white">
									{$page.data.user.name || $page.data.user.login}
								</p>
								<button
									type="submit"
									class="cursor-pointer text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
								>
									Sign out
								</button>
							</form>
						</div>
					{/if}

					<a
						href="https://sentry.io"
						class="flex flex-row items-center text-xs text-gray-400 dark:text-gray-500"
					>
						<img src="/sentry-logo.svg" alt="Sentry Logo" class="h-8 w-8" />
						(Internal)
					</a>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto w-full max-w-7xl flex-grow overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
		<div class="mx-auto w-full max-w-6xl">
			{@render children?.()}
		</div>
	</main>

	<!-- Footer -->
	<footer class="mt-auto border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
		<div class="flex w-full flex-row items-center justify-center gap-8 py-2">
			<p class="text-center text-xs text-gray-500 dark:text-gray-400">
				"Because the only thing worse than a bug is a bug that was already fixed but you didn't know
				about it."
			</p>
			<a
				href="https://github.com/getsentry/hackweek-wtfy"
				target="_blank"
				rel="noopener noreferrer"
				class="flex justify-center"
				aria-label="View on GitHub"
			>
				<Github
					class="h-8 w-8 cursor-pointer rounded-full border-[0.5px] p-2 text-white hover:bg-gray-100 dark:hover:bg-gray-700"
				/>
			</a>
		</div>
	</footer>
</div>
