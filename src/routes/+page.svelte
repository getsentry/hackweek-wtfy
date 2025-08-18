<script lang="ts">
	import { Search, AlertCircle, CheckCircle, LoaderCircle, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	
	// Form state using Svelte 5 runes
	let sdk = $state('');
	let version = $state('');
	let description = $state('');
	let isLoading = $state(false);
	
	// Collapsible panel state
	let isWarningExpanded = $state(false);
	let isProTipsExpanded = $state(false);

	// Get result and error from form action
	const result = $derived(form?.success ? form.result : null);
	const error = $derived(form?.error || null);

	// Client-side validation
	const isValidSdk = $derived(sdk.trim().length > 0);
	const isValidVersion = $derived(version.trim().length > 0);
	const isValidDescription = $derived(description.trim().length >= 10);
	const isFormValid = $derived(isValidSdk && isValidVersion && isValidDescription);

	// Validation error messages
	const validationErrors = $derived({
		sdk: !isValidSdk && sdk.length > 0 ? 'Please select an SDK' : null,
		version: !isValidVersion && version.length > 0 ? 'Version is required' : null
	});

	// Description character count helper
	const descriptionHelper = $derived(
		description.length === 0
			? null
			: 10 - description.length > 0
				? `${10 - description.length} more character${10 - description.length === 1 ? '' : 's'} needed`
				: undefined
	);

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

	function resetForm() {
		sdk = '';
		version = '';
		description = '';
		// Clear the form result by navigating to the same page
		window.location.href = window.location.pathname;
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

	<!-- Privacy Warning Panel -->
	<div class="mb-6 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-900/20">
		<button
			type="button"
			onclick={() => isWarningExpanded = !isWarningExpanded}
			class="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-colors"
		>
			<div class="flex items-center">
				<AlertTriangle class="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
				<span class="font-medium text-orange-800 dark:text-orange-200">Important: Privacy Guidelines</span>
			</div>
			{#if isWarningExpanded}
				<ChevronDown class="h-4 w-4 text-orange-600 dark:text-orange-400" />
			{:else}
				<ChevronRight class="h-4 w-4 text-orange-600 dark:text-orange-400" />
			{/if}
		</button>
		
		{#if isWarningExpanded}
			<div class="px-4 pb-4">
				<div class="border-t border-orange-200 dark:border-orange-800 pt-3">
					<p class="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">
						⚠️ DO NOT include customer data in your description!
					</p>
					<ul class="text-sm text-orange-700 dark:text-orange-300 space-y-1">
						<li>• No company names or customer identifiers</li>
						<li>• No revenue data (ARR, MRR, etc.)</li>
						<li>• No personal or sensitive information</li>
						<li>• Use generic terms like "large enterprise customer" instead</li>
					</ul>
				</div>
			</div>
		{/if}
	</div>

	<!-- Main Form Card -->
	<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8">
		<form method="post" use:enhance={() => {
			isLoading = true;
			return async ({ update }) => {
				await update();
				isLoading = false;
			};
		}} class="space-y-6">
			<!-- SDK Selection -->
			<div>
				<label for="sdk" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Select SDK <span class="text-orange-500">*</span>
				</label>
				<select
					id="sdk"
					name="sdk"
					bind:value={sdk}
					required
					class="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 {!isValidSdk && sdk.length > 0 ? 'border-orange-300 focus:border-orange-400 focus:ring-orange-200' : ''}"
				>
					<option value="">Choose an SDK...</option>
					{#each sdks as sdkOption}
						<option value={sdkOption.value}>{sdkOption.label}</option>
					{/each}
				</select>
				{#if validationErrors.sdk}
					<p class="mt-1 text-sm text-orange-600 dark:text-orange-400">{validationErrors.sdk}</p>
				{/if}
			</div>

			<!-- Version Input -->
			<div>
				<label for="version" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Your Current Version <span class="text-orange-500">*</span>
				</label>
				<input
					id="version"
					name="version"
					type="text"
					bind:value={version}
					placeholder="e.g., 7.0.0 or 1.25.1"
					required
					class="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 {!isValidVersion && version.length > 0 ? 'border-orange-300 focus:border-orange-400 focus:ring-orange-200' : ''}"
				/>
				{#if validationErrors.version}
					<p class="mt-1 text-sm text-orange-600 dark:text-orange-400">{validationErrors.version}</p>
				{:else}
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						We'll check if your issue was fixed in any version after this one.
					</p>
				{/if}
			</div>

			<!-- Issue Description -->
			<div>
				<label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Describe Your Issue <span class="text-orange-500">*</span>
				</label>
				<textarea
					id="description"
					name="description"
					bind:value={description}
					rows="4"
					placeholder="Describe the bug, error, or unexpected behavior you're experiencing..."
					required
					class="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 {!isValidDescription && description.length > 0 ? 'border-orange-300 focus:border-orange-400 focus:ring-orange-200' : ''}"
				></textarea>
				{#if descriptionHelper}
					<p class="mt-1 text-sm text-orange-600 dark:text-orange-400 opacity-60">{descriptionHelper}</p>
				{:else}
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						Be specific! Include error messages, expected vs actual behavior, or any relevant context.
					</p>
				{/if}
			</div>

			<!-- Submit Button -->
			<div class="flex gap-4">
				<button
					type="submit"
					disabled={isLoading || !isFormValid}
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
			
			{#if !isFormValid && !isLoading}
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
					Please fill out all fields. The description must be at least 10 characters long.
				</p>
			{/if}
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
	<div class="mt-12 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
		<button
			type="button"
			onclick={() => isProTipsExpanded = !isProTipsExpanded}
			class="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
		>
			<h3 class="text-lg font-medium text-indigo-900 dark:text-indigo-200">
				💡 Pro Tips for Better Results
			</h3>
			{#if isProTipsExpanded}
				<ChevronDown class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
			{:else}
				<ChevronRight class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
			{/if}
		</button>
		
		{#if isProTipsExpanded}
			<div class="px-6 pb-6">
				<div class="border-t border-indigo-200 dark:border-indigo-800 pt-4">
					<ul class="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
						<li>• Include specific error messages or stack traces when possible</li>
						<li>• Mention the platform/environment (Node.js, browser, React Native, etc.)</li>
						<li>• Describe what you expected vs what actually happened</li>
						<li>• If it's a performance issue, include metrics or specifics</li>
					</ul>
				</div>
			</div>
		{/if}
	</div>
</div>
