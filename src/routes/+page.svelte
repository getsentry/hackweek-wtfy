<script lang="ts">
	import { Search, AlertCircle, CheckCircle, LoaderCircle } from 'lucide-svelte';
	
	// Form state using Svelte 5 runes
	let sdk = $state('');
	let version = $state('');
	let description = $state('');
	let isLoading = $state(false);
	let result = $state<{
		status: 'fixed' | 'not_fixed' | 'unknown';
		confidence: number;
		summary?: string;
		prs?: Array<{ title: string; url: string; number: number }>;
	} | null>(null);
	let error = $state<string | null>(null);

	// Common Sentry SDKs
	const sdks = [
		{ value: 'sentry-javascript', label: 'JavaScript SDK' },
		{ value: 'sentry-python', label: 'Python SDK' },
		{ value: 'sentry-java', label: 'Java SDK' },
		{ value: 'sentry-dotnet', label: '.NET SDK' },
		{ value: 'sentry-go', label: 'Go SDK' },
		{ value: 'sentry-ruby', label: 'Ruby SDK' },
		{ value: 'sentry-php', label: 'PHP SDK' },
		{ value: 'sentry-react-native', label: 'React Native SDK' },
		{ value: 'sentry-cocoa', label: 'iOS/macOS SDK' },
		{ value: 'sentry-android', label: 'Android SDK' }
	];

	async function analyzeIssue() {
		if (!sdk || !version || !description.trim()) {
			error = 'Please fill in all fields';
			return;
		}

		isLoading = true;
		error = null;
		result = null;

		try {
			const response = await fetch('/api/analyze', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					sdk,
					version,
					description: description.trim()
				})
			});

			if (!response.ok) {
				throw new Error(`Analysis failed: ${response.statusText}`);
			}

			result = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			isLoading = false;
		}
	}

	function resetForm() {
		sdk = '';
		version = '';
		description = '';
		result = null;
		error = null;
	}
</script>

<div class="max-w-4xl mx-auto">
	<!-- Hero Section -->
	<div class="text-center mb-12">
		<h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
			Was It Fixed Yet?
		</h1>
		<p class="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
			Tired of debugging issues that might have been fixed in newer SDK versions? 
			Let our AI dig through changelogs and PRs so you don't have to.
		</p>
	</div>

	<!-- Main Form Card -->
	<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8">
		<form onsubmit={analyzeIssue} method="post" class="space-y-6">
			<!-- SDK Selection -->
			<div>
				<label for="sdk" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Select SDK
				</label>
				<select
					id="sdk"
					bind:value={sdk}
					required
					class="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
				>
					<option value="">Choose an SDK...</option>
					{#each sdks as sdkOption}
						<option value={sdkOption.value}>{sdkOption.label}</option>
					{/each}
				</select>
			</div>

			<!-- Version Input -->
			<div>
				<label for="version" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Your Current Version
				</label>
				<input
					id="version"
					type="text"
					bind:value={version}
					placeholder="e.g., 7.0.0 or 1.25.1"
					required
					class="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					We'll check if your issue was fixed in any version after this one.
				</p>
			</div>

			<!-- Issue Description -->
			<div>
				<label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Describe Your Issue
				</label>
				<textarea
					id="description"
					bind:value={description}
					rows="4"
					placeholder="Describe the bug, error, or unexpected behavior you're experiencing..."
					required
					class="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
				></textarea>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Be specific! Include error messages, expected vs actual behavior, or any relevant context.
				</p>
			</div>

			<!-- Submit Button -->
			<div class="flex gap-4">
				<button
					type="submit"
					disabled={isLoading || !sdk || !version || !description.trim()}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isLoading}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						Analyzing...
					{:else}
						<Search class="mr-2 h-4 w-4" />
						Check If Fixed
					{/if}
				</button>
				
				{#if result}
					<button
						type="button"
						onclick={resetForm}
						class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						New Analysis
					</button>
				{/if}
			</div>
		</form>
	</div>

	<!-- Error Display -->
	{#if error}
		<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
			<div class="flex">
				<AlertCircle class="h-5 w-5 text-red-400" />
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800 dark:text-red-200">
						Analysis Error
					</h3>
					<p class="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Results Display -->
	{#if result}
		<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
			<div class="flex items-start space-x-4">
				<div class="flex-shrink-0">
					{#if result.status === 'fixed'}
						<CheckCircle class="h-8 w-8 text-green-500" />
					{:else if result.status === 'not_fixed'}
						<AlertCircle class="h-8 w-8 text-red-500" />
					{:else}
						<AlertCircle class="h-8 w-8 text-yellow-500" />
					{/if}
				</div>
				<div class="flex-1">
					<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
						{#if result.status === 'fixed'}
							🎉 Good News! Likely Fixed
						{:else if result.status === 'not_fixed'}
							😞 Probably Still Broken
						{:else}
							🤷‍♂️ Unclear
						{/if}
					</h2>
					
					<div class="mb-4">
						<span class="inline-block bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm text-gray-600 dark:text-gray-300">
							Confidence: {result.confidence}%
						</span>
					</div>

					{#if result.summary}
						<p class="text-gray-600 dark:text-gray-300 mb-4">{result.summary}</p>
					{/if}

					{#if result.prs && result.prs.length > 0}
						<div>
							<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">
								Relevant Pull Requests:
							</h3>
							<div class="space-y-2">
								{#each result.prs as pr}
									<a
										href={pr.url}
										target="_blank"
										rel="noopener noreferrer"
										class="block p-3 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
									>
										<div class="font-medium text-indigo-600 dark:text-indigo-400">
											#{pr.number}: {pr.title}
										</div>
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Tips Section -->
	<div class="mt-12 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
		<h3 class="text-lg font-medium text-indigo-900 dark:text-indigo-200 mb-3">
			💡 Pro Tips for Better Results
		</h3>
		<ul class="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
			<li>• Include specific error messages or stack traces when possible</li>
			<li>• Mention the platform/environment (Node.js, browser, React Native, etc.)</li>
			<li>• Describe what you expected vs what actually happened</li>
			<li>• If it's a performance issue, include metrics or specifics</li>
		</ul>
	</div>
</div>
