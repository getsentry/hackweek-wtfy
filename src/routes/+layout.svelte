<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<title>WTFY - Was It Fixed Yet?</title>
	<meta name="description" content="Internal Sentry tool to check if SDK issues were fixed in newer versions" />
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center">
					<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
						WTFY
					</h1>
					<span class="ml-2 text-sm text-gray-500 dark:text-gray-400">
						Was It Fixed Yet?
					</span>
				</div>
				<div class="text-xs text-gray-400 dark:text-gray-500">
					Internal Sentry Tool
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
		{@render children?.()}
	</main>

	<!-- Footer -->
	<footer class="mt-12 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
			<p class="text-center text-xs text-gray-500 dark:text-gray-400">
				"Because the only thing worse than a bug is a bug that was already fixed but you didn't know about it."
			</p>
		</div>
	</footer>
</div>
