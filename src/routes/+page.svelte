<script lang="ts">
	import { Search, LoaderCircle, TriangleAlert, CircleAlert, TestTube, Zap, Clock, CheckCircle2 } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { dev } from '$app/environment';
	import { Button, CollapsiblePanel, FormField, ResultsCard, SkeletonLoader, AnalysisProgress, ErrorCard, RequestHistory } from '$lib';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	
	// Form state using Svelte 5 runes
	let sdk = $state('');
	let version = $state('');
	let description = $state('');
	let isLoading = $state(false);
	let analysisStep = $state(0);
	let currentRequestId = $state<number | null>(null);
	
	// Collapsible panel state
	let isWarningExpanded = $state(false);
	let isProTipsExpanded = $state(false);
	let isHistoryExpanded = $state(false);

	// Analysis steps for progress indicator
	const analysisSteps = [
		{ title: 'Extracting Keywords', description: 'AI analyzing your issue description for search terms' },
		{ title: 'Searching Commits', description: 'Looking through repository history for relevant changes' },
		{ title: 'Analyzing Commits', description: 'AI evaluating commit messages for potential fixes' },
		{ title: 'Fetching PR Details', description: 'Getting detailed information about relevant pull requests' },
		{ title: 'Final Analysis', description: 'Combining all findings to determine if issue was fixed' }
	];

	// Get result and error from form action
	const result = $derived(form?.success ? form.result : null);
	const error = $derived(form?.error || null);
	
	// Start progress polling when we get a request ID
	$effect(() => {
		if (form?.success && form.requestId && !result?.fromCache) {
			currentRequestId = form.requestId;
			startProgressPolling(form.requestId);
		}
	});

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
		analysisStep = 0;
		currentRequestId = null;
		// Clear the form result by navigating to the same page to reset form action state
		window.location.href = window.location.pathname;
	}

	function populateTestData() {
		sdk = 'sentry-javascript';
		version = '7.48.0';
		description = 'My Web vital measurements are very inaccurate and differ a lot from the official web vitals library measurements as well as from the chrome dev tool vitals for the same pageload. Is there an SDK bug?';
	}

	function populateFromHistory(historySdk: string, historyVersion: string, historyDescription: string) {
		sdk = historySdk;
		version = historyVersion;
		description = historyDescription;
		analysisStep = 0;
		currentRequestId = null;
		// Don't reload - just populate the form
	}

	function retryAnalysis() {
		// Reset form to retry the same analysis
		analysisStep = 0;
		currentRequestId = null;
		window.location.href = window.location.pathname;
	}

	// Real-time progress polling
	async function startProgressPolling(requestId: number) {
		if (!requestId) return;
		
		console.log(`Starting progress polling for request ${requestId}`);
		
		const pollInterval = setInterval(async () => {
			try {
				const response = await fetch(`/api/progress/${requestId}`);
				if (response.ok) {
					const progressData = await response.json();
					console.log(`Progress update:`, progressData);
					analysisStep = progressData.currentStep;
					
					// Update step description if available
					if (progressData.stepDescription) {
						const stepIndex = progressData.currentStep - 1;
						if (stepIndex >= 0 && stepIndex < analysisSteps.length) {
							analysisSteps[stepIndex].description = progressData.stepDescription;
						}
					}
					
					// Stop polling when completed or error
					if (progressData.isCompleted || progressData.error) {
						clearInterval(pollInterval);
						console.log(`Progress polling completed for request ${requestId}`);
					}
				}
			} catch (err) {
				console.error('Progress polling error:', err);
				// Continue polling despite errors
			}
		}, 2000); // Poll every 2 seconds

		// Cleanup after 60 seconds to prevent runaway polling
		setTimeout(() => {
			clearInterval(pollInterval);
			console.log(`Progress polling timeout for request ${requestId}`);
		}, 60000);
	}
</script>

<div class="w-full">
	<!-- Hero Section -->
	<div class="text-center mb-12 animate-in fade-in-0 slide-in-from-top-4 duration-700">
		<div class="flex items-center justify-center mb-4">
			<Zap class="h-10 w-10 text-indigo-600 dark:text-indigo-400 mr-3" />
			<h1 class="text-4xl font-bold text-gray-900 dark:text-white">
				Was This Fixed Yet?
			</h1>
		</div>
		<p class="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
			Tired of debugging issues that might have been fixed in newer SDK versions? 
			Let our AI dig through changelogs and PRs so you don't have to.
		</p>
		<div class="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-500 dark:text-gray-400">
			<div class="flex items-center bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
				<CheckCircle2 class="h-4 w-4 mr-1 text-green-500" />
				AI-Powered Analysis
			</div>
			<div class="flex items-center bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
				<Clock class="h-4 w-4 mr-1 text-blue-500" />
				~10 Second Results
			</div>
			<div class="flex items-center bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full">
				<Zap class="h-4 w-4 mr-1 text-yellow-500" />
				Real GitHub Data
			</div>
		</div>
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
				DO NOT include customer data in your description!
			</p>
			<ul class="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-disc list-inside pl-2">
				<li>No company names or customer identifiers</li>
				<li>No revenue data (ARR, MRR, etc.)</li>
				<li>No personal or sensitive information</li>
				<li>Use generic terms like "large enterprise customer" instead</li>
			</ul>
		{/snippet}
	</CollapsiblePanel>

	<!-- Development Tools -->
	{#if true}
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

	<!-- Main Content Layout (hidden during analysis) -->
	{#if !isLoading}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
			<!-- Main Form Panel (2/3 width on large screens) -->
			<div class="lg:col-span-2">
				<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200 h-fit">
					<div class="mb-6 border-l-4 border-indigo-500 pl-4">
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
							Analyze Your Issue
						</h2>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Tell us about your issue and we'll check if it's been fixed in newer SDK versions.
						</p>
					</div>

					<form method="POST" use:enhance={() => {
						isLoading = true;
						analysisStep = 0;
						currentRequestId = null;
						return async ({ update }) => {
							await update();
							isLoading = false;
							// Don't reset analysisStep here - let progress polling handle it
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

						<!-- Form Status Feedback -->
						<div class="flex justify-center mb-4">
							{#if !isFormValid}
								<p class="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700">
									Please fill out all fields. The description must be at least 10 characters long.
								</p>
							{:else if !result}
								<p class="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full border border-green-200 dark:border-green-700">
									Ready to analyze! Click the button below.
								</p>
							{/if}
						</div>

						<!-- Submit Button -->
						<div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 -mx-2">
							<div class="flex flex-col gap-4 justify-center">
								<Button
									type="submit"
									variant="primary"
									disabled={!isFormValid}
									icon={Search}
									class="justify-center py-3 px-8 text-base font-medium shadow-lg hover:shadow-xl transition-shadow"
								>
									Check If Fixed
								</Button>
								
								{#if result}
									<Button
										type="button"
										variant="secondary"
										onclick={resetForm}
										class="justify-center"
									>
										New Analysis
									</Button>
								{/if}
							</div>
						</div>
					</form>
				</div>

				<!-- Pro Tips Section (underneath form) -->
				<div class="mt-6">
					<CollapsiblePanel
						title="💡 Pro Tips for Better Results"
						variant="info"
						bind:isExpanded={isProTipsExpanded}
					>
						{#snippet children()}
							<div class="grid md:grid-cols-2 gap-4">
								<div>
									<h4 class="font-medium text-indigo-900 dark:text-indigo-200 mb-2">📝 Description Best Practices</h4>
									<ul class="space-y-1 text-sm text-indigo-800 dark:text-indigo-300">
										<li>• Include specific error messages or stack traces</li>
										<li>• Mention the platform/environment (Node.js, browser, etc.)</li>
										<li>• Describe expected vs actual behavior</li>
									</ul>
								</div>
								<div>
									<h4 class="font-medium text-indigo-900 dark:text-indigo-200 mb-2">🔍 What We Look For</h4>
									<ul class="space-y-1 text-sm text-indigo-800 dark:text-indigo-300">
										<li>• Bug fixes in commit messages</li>
										<li>• Performance improvements and optimizations</li>
										<li>• API changes that might resolve your issue</li>
									</ul>
								</div>
							</div>
							<div class="mt-4 p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
								<p class="text-sm text-indigo-800 dark:text-indigo-300">
									💡 <strong>Pro tip:</strong> The more specific your description, the better our AI can match it against fixes in the codebase.
								</p>
							</div>
						{/snippet}
					</CollapsiblePanel>
				</div>
			</div>

			<!-- Recent Analyses Panel (1/3 width on large screens) -->
			<div class="lg:col-span-1">
				<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300 h-fit sticky top-8">
					<div class="p-4 border-b border-gray-200 dark:border-gray-700">
						<h3 class="text-lg font-medium text-gray-900 dark:text-white">
							📋 Recent Analyses
						</h3>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Last 5 • Click to reuse
						</p>
					</div>
					<div class="p-4">
						<RequestHistory onPopulateForm={populateFromHistory} />
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Analysis Progress (shown during loading) -->
	{#if isLoading}
		<div class="mb-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
			<AnalysisProgress currentStep={analysisStep} steps={analysisSteps} />
		</div>
	{/if}

	<!-- Error Display -->
	{#if error}
		<div class="mb-6">
			<ErrorCard 
				title="Analysis Failed" 
				message={error} 
				type="error"
				canRetry={true}
				onRetry={retryAnalysis}
				helpLink={{
					text: "Report Issue",
					url: "https://github.com/getsentry/wtfy/issues"
				}}
			/>
		</div>
	{/if}

	<!-- Results Display -->
	{#if result}
		<div class="mb-8">
			<ResultsCard {result} />
		</div>
	{/if}
</div>
