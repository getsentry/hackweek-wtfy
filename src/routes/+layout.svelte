<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Github } from 'lucide-svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>WTFY - Was This Fixed Yet?</title>
	<meta name="description" content="Internal Sentry tool to check if SDK issues were fixed in newer versions" />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
	<!-- Header -->
	<header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center">
					<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
						WTFY
					</h1>
				</div>
				<a href="https://sentry.io" class="text-xs text-gray-400 dark:text-gray-500 flex flex-row items-center">
					<img src="/sentry-logo.svg" alt="Sentry Logo" class="h-8 w-8" />
					(Internal)
				</a>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-grow overflow-x-hidden">
		<div class="w-full max-w-6xl mx-auto">
			{@render children?.()}
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-auto ">
		<div class="w-full flex flex-row items-center justify-center gap-8 py-2">

			<p class="text-center text-xs text-gray-500 dark:text-gray-400 ">
				"Because the only thing worse than a bug is a bug that was already fixed but you didn't know about it."
			</p>
			<a
			href="https://github.com/getsentry/hackweek-wtfy"
			target="_blank"
			rel="noopener noreferrer"
			class="flex justify-center"
			aria-label="View on GitHub"
			>
			<Github class="h-8 w-8 text-white border-[0.5px] rounded-full p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" />
		</a>
	</div>
	</footer>
</div>
