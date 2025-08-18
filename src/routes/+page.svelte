<script lang="ts">
	import { Search, LoaderCircle, TriangleAlert, CircleAlert, TestTube } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { dev } from '$app/environment';
	import { Button, CollapsiblePanel, FormField, ResultsCard } from '$lib';
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

	function populateTestData() {
		sdk = 'sentry-javascript';
		version = '7.48.0';
		description = 'My Web vital measurements are very inaccurate and differ a lot from the official web vitals library measurements as well as from the chrome dev tool vitals for the same pageload. Is there an SDK bug?';
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
	<CollapsiblePanel
		title="Important: Read This If You Want To Keep Your Job"
		variant="warning"
		icon={TriangleAlert}
		bind:isExpanded={isWarningExpanded}
		class="mb-6"
	>
		{#snippet children()}
			<p class="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">
				⚠️ DO NOT include customer data in your description!
			</p>
			<ul class="text-sm text-orange-700 dark:text-orange-300 space-y-1">
				<li>• No company names or customer identifiers</li>
				<li>• No revenue data (ARR, MRR, etc.)</li>
				<li>• No personal or sensitive information</li>
				<li>• Use generic terms like "large enterprise customer" instead</li>
			</ul>
		{/snippet}
	</CollapsiblePanel>

	<!-- Development Tools (only visible in dev mode) -->
	{#if dev}
		<div class="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
			<div class="flex items-center justify-between">
				<div class="flex items-center">
					<TestTube class="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
					<span class="text-sm font-medium text-amber-800 dark:text-amber-200">Development Mode</span>
				</div>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={populateTestData}
					class="bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/70"
				>
					Fill Test Data
				</Button>
			</div>
		</div>
	{/if}

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
			<FormField
				id="sdk"
				name="sdk"
				label="Select SDK"
				type="select"
				required
				placeholder="Choose an SDK..."
				options={sdks}
				bind:value={sdk}
				error={validationErrors.sdk}
			/>

			<!-- Version Input -->
			<FormField
				id="version"
				name="version"
				label="Your Current Version"
				type="text"
				required
				placeholder="e.g., 7.0.0 or 1.25.1"
				bind:value={version}
				error={validationErrors.version}
				helper="We'll check if your issue was fixed in any version after this one."
			/>

			<!-- Issue Description -->
			<FormField
				id="description"
				name="description"
				label="Describe Your Issue"
				type="textarea"
				required
				rows={4}
				placeholder="Describe the bug, error, or unexpected behavior you're experiencing..."
				bind:value={description}
				error={descriptionHelper ? descriptionHelper : null}
				helper={descriptionHelper ? null : "Be specific! Include error messages, expected vs actual behavior, or any relevant context."}
			/>

			<!-- Submit Button -->
			<div class="flex gap-4">
				<Button
					type="submit"
					variant="primary"
					disabled={isLoading || !isFormValid}
					icon={isLoading ? LoaderCircle : Search}
				>
					{isLoading ? 'Analyzing...' : 'Check If Fixed'}
				</Button>
				
				{#if result}
					<Button
						type="button"
						variant="secondary"
						onclick={resetForm}
					>
						New Analysis
					</Button>
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
				<CircleAlert class="h-5 w-5 text-red-400" />
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
		<ResultsCard {result} />
	{/if}

	<!-- Tips Section -->
	<CollapsiblePanel
		title="💡 Pro Tips for Better Results"
		variant="info"
		bind:isExpanded={isProTipsExpanded}
		class="mt-12"
	>
		{#snippet children()}
			<ul class="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
				<li>• Include specific error messages or stack traces when possible</li>
				<li>• Mention the platform/environment (Node.js, browser, React Native, etc.)</li>
				<li>• Describe what you expected vs what actually happened</li>
				<li>• If it's a performance issue, include metrics or specifics</li>
			</ul>
		{/snippet}
	</CollapsiblePanel>
</div>
