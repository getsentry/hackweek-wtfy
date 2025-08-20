<script lang="ts">
	import {
		Search,
		LoaderCircle,
		TriangleAlert,
		CircleAlert,
		Zap,
		Clock,
		CheckCircle2,
		RotateCcw
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { v4 as uuidv4 } from 'uuid';
	import {
		Button,
		CollapsiblePanel,
		FormField,
		ResultsCard,
		SkeletonLoader,
		AnalysisProgress,
		ErrorCard,
		RequestHistory
	} from '$lib';
	import type { ActionData } from './$types';
	import * as Sentry from '@sentry/sveltekit';

	let { form }: { form: ActionData } = $props();

	// Form state using Svelte 5 runes
	let sdk = $state('');
	let version = $state('');
	let description = $state('');
	let isLoading = $state(false);
	let analysisStep = $state(0);
	let currentRequestId = $state<string | null>(null);

	// View state management
	type ViewState = 'form' | 'progress' | 'result';
	let currentView = $state<ViewState>('form');
	let storedResult = $state<any>(null);
	let storedQuery = $state<{ sdk: string; version: string; description: string } | null>(null);

	// Component references
	let requestHistory: any;

	// Collapsible panel state
	let isWarningExpanded = $state(false);
	let isProTipsExpanded = $state(false);
	let isHistoryExpanded = $state(false);

	// Analysis steps for progress indicator
	const analysisSteps = [
		{
			title: 'Extracting Keywords',
			description: 'AI analyzing your issue description for search terms'
		},
		{
			title: 'Searching Commits',
			description: 'Looking through repository history for relevant changes'
		},
		{
			title: 'Analyzing Commits',
			description: 'AI evaluating commit messages for potential fixes'
		},
		{
			title: 'Fetching PR Details',
			description: 'Getting detailed information about relevant pull requests'
		},
		{
			title: 'Final Analysis',
			description: 'Combining all findings to determine if issue was fixed'
		}
	];

	// Get result and error from form action
	const result = $derived(form?.success ? form.result : null);
	const error = $derived(form?.error || null);

	// Handle form completion and results
	$effect(() => {
		if (form?.success && form.result) {
			// Analysis completed, stop any ongoing polling
			isLoading = false;
			analysisStep = 5; // Show final step completed
			currentView = 'result';
			storedResult = form.result;
			storedQuery = { sdk, version, description };
		}
	});

	// Update view state based on loading
	$effect(() => {
		if (isLoading) {
			currentView = 'progress';
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

	function populateFromHistory(
		historySdk: string,
		historyVersion: string,
		historyDescription: string
	) {
		sdk = historySdk;
		version = historyVersion;
		description = historyDescription;
		analysisStep = 0;
		currentRequestId = null;
		currentView = 'form';
		storedResult = null;
		storedQuery = null;
		// Don't reload - just populate the form
	}

	function showHistoryResult(historyItem: any) {
		if (historyItem.result) {
			storedResult = historyItem.result;
			storedQuery = {
				sdk: historyItem.sdk,
				version: historyItem.version,
				description: historyItem.description
			};
			currentView = 'result';
		}
	}

	function startNewQuery() {
		sdk = '';
		version = '';
		description = '';
		analysisStep = 0;
		currentRequestId = null;
		currentView = 'form';
		storedResult = null;
		storedQuery = null;
	}

	function retryStoredQuery() {
		if (storedQuery) {
			sdk = storedQuery.sdk;
			version = storedQuery.version;
			description = storedQuery.description;
			currentView = 'form';
			// Trigger form submission programmatically
			const form = document.querySelector('form');
			if (form) {
				form.requestSubmit();
			}
		}
	}

	function populateStoredQuery() {
		if (storedQuery) {
			sdk = storedQuery.sdk;
			version = storedQuery.version;
			description = storedQuery.description;
			currentView = 'form';
		}
	}

	function retryAnalysis() {
		// Reset form to retry the same analysis
		analysisStep = 0;
		currentRequestId = null;
		window.location.href = window.location.pathname;
	}

	// Real-time progress polling
	async function startProgressPolling(requestId: string) {
		if (!requestId) return;

		console.log(`Starting progress polling for request ${requestId}`);

		const pollInterval = setInterval(async () => {
			await Sentry.startSpan(
				{
					op: 'http.client.poll',
					name: 'Progress polling',
					attributes: {
						requestId
					}
				},
				async () => {
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
				}
			);
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
	<div class="animate-in fade-in-0 slide-in-from-top-4 mb-12 text-center duration-700">
		<div class="mb-4 flex items-center justify-center">
			<Zap class="mr-3 h-10 w-10 text-indigo-600 dark:text-indigo-400" />
			<h1 class="text-4xl font-bold text-gray-900 dark:text-white">Was This Fixed Yet?</h1>
		</div>
		<p class="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-300">
			Tired of debugging issues that might have been fixed in newer SDK versions? Let our AI dig
			through changelogs and PRs so you don't have to.
		</p>
		<div
			class="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 sm:gap-6 dark:text-gray-400"
		>
			<div class="flex items-center rounded-full bg-green-50 px-3 py-1.5 dark:bg-green-900/20">
				<CheckCircle2 class="mr-1 h-4 w-4 text-green-500" />
				AI-Powered Analysis
			</div>
			<div class="flex items-center rounded-full bg-blue-50 px-3 py-1.5 dark:bg-blue-900/20">
				<Clock class="mr-1 h-4 w-4 text-blue-500" />
				~10 Second Results
			</div>
			<div class="flex items-center rounded-full bg-yellow-50 px-3 py-1.5 dark:bg-yellow-900/20">
				<Zap class="mr-1 h-4 w-4 text-yellow-500" />
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
			<p class="mb-2 text-sm font-medium text-orange-800 dark:text-orange-200">
				DO NOT include customer data in your description!
			</p>
			<ul class="list-inside list-disc space-y-1 pl-2 text-sm text-orange-700 dark:text-orange-300">
				<li>No company names or customer identifiers</li>
				<li>No revenue data (ARR, MRR, etc.)</li>
				<li>No personal or sensitive information</li>
				<li>Use generic terms like "large enterprise customer" instead</li>
			</ul>
		{/snippet}
	</CollapsiblePanel>

	<!-- Main Content Layout -->
	<div class="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main Panel (2/3 width on large screens) -->
		<div class="lg:col-span-2">
			{#if currentView === 'form'}
				<div
					class="animate-in fade-in-0 slide-in-from-bottom-4 h-fit rounded-lg bg-white p-6 shadow-lg delay-200 duration-500 dark:bg-gray-800"
				>
					<div class="mb-6 border-l-4 border-indigo-500 pl-4">
						<h2 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
							Analyze Your Issue
						</h2>
						<p class="text-sm text-gray-600 dark:text-gray-400">
							Tell us about your issue and we'll check if it's been fixed in newer SDK versions.
						</p>
					</div>

					<form
						method="POST"
						use:enhance={({ formData }) => {
							// Generate request ID and start polling immediately
							const requestId = uuidv4();
							formData.append('requestId', requestId);

							currentRequestId = requestId;
							isLoading = true;
							analysisStep = 0;

							console.log(`Generated request ID: ${requestId}, starting progress polling`);
							startProgressPolling(requestId);

							return async ({ update }) => {
								// Add request ID to form data
								await update();
								isLoading = false;
							};
						}}
						class="space-y-6"
					>
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
							helper={descriptionHelper
								? null
								: 'Be specific! Include error messages, expected vs actual behavior, or any relevant context.'}
						/>

						<!-- Form Status Feedback -->
						<div class="mb-4 flex justify-center">
							{#if !isFormValid}
								<p
									class="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
								>
									Please fill out all fields. The description must be at least 10 characters long.
								</p>
							{:else if !result}
								<p
									class="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-600 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400"
								>
									Ready to analyze! Click the button below.
								</p>
							{/if}
						</div>

						<!-- Submit Button -->
						<div class="-mx-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
							<div class="flex flex-col justify-center gap-4">
								<Button
									type="submit"
									variant="primary"
									disabled={!isFormValid}
									icon={Search}
									class="justify-center px-8 py-3 text-base font-medium shadow-lg transition-shadow hover:shadow-xl"
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
							<div class="grid gap-4 md:grid-cols-2">
								<div>
									<h4 class="mb-2 font-medium text-indigo-900 dark:text-indigo-200">
										📝 Description Best Practices
									</h4>
									<ul class="space-y-1 text-sm text-indigo-800 dark:text-indigo-300">
										<li>• Include specific error messages or stack traces</li>
										<li>• Mention the platform/environment (Node.js, browser, etc.)</li>
										<li>• Describe expected vs actual behavior</li>
									</ul>
								</div>
								<div>
									<h4 class="mb-2 font-medium text-indigo-900 dark:text-indigo-200">
										🔍 What We Look For
									</h4>
									<ul class="space-y-1 text-sm text-indigo-800 dark:text-indigo-300">
										<li>• Bug fixes in commit messages</li>
										<li>• Performance improvements and optimizations</li>
										<li>• API changes that might resolve your issue</li>
									</ul>
								</div>
							</div>
							<div class="mt-4 rounded-lg bg-indigo-100 p-3 dark:bg-indigo-900/20">
								<p class="text-sm text-indigo-800 dark:text-indigo-300">
									💡 <strong>Pro tip:</strong> The more specific your description, the better our AI
									can match it against fixes in the codebase.
								</p>
							</div>
						{/snippet}
					</CollapsiblePanel>
				</div>
			{:else if currentView === 'progress'}
				<div class="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
					<AnalysisProgress currentStep={analysisStep} steps={analysisSteps} />
				</div>
			{:else if currentView === 'result' && storedResult}
				<ResultsCard
					result={storedResult}
					onRetry={retryStoredQuery}
					onEdit={populateStoredQuery}
					onNewQuery={startNewQuery}
				/>
			{/if}
		</div>

		<!-- Recent Analyses Panel (1/3 width on large screens) -->
		<div class="lg:col-span-1">
			<div
				class="animate-in fade-in-0 slide-in-from-bottom-4 sticky top-8 h-fit rounded-lg bg-white shadow-lg delay-300 duration-500 dark:bg-gray-800"
			>
				<div class="border-b border-gray-200 p-4 dark:border-gray-700">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">📋 Recent Queries</h3>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Last 5 • Click to reuse</p>
						</div>
						<Button
							variant="secondary"
							size="sm"
							onclick={() => requestHistory?.refresh()}
							icon={RotateCcw}
							title="Refresh history"
							class="h-8 w-8 p-0"
						></Button>
					</div>
				</div>
				<div class="p-4">
					<RequestHistory
						bind:this={requestHistory}
						onPopulateForm={populateFromHistory}
						onShowResult={showHistoryResult}
					/>
				</div>
			</div>
		</div>
	</div>

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
					text: 'Report Issue',
					url: 'https://github.com/getsentry/wtfy/issues'
				}}
			/>
		</div>
	{/if}
</div>
