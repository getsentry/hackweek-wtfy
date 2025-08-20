<script lang="ts">
	import {
		CircleCheck,
		Search,
		Brain,
		GitCommit,
		GitPullRequest,
		Zap,
		ArrowLeft
	} from 'lucide-svelte';
	import { Button } from '$lib';

	const analysisSteps = [
		{
			icon: Brain,
			title: 'AI Keyword Extraction',
			description:
				'Our AI analyzes your issue description to extract key search terms and technical concepts.',
			details:
				'Using GPT-4, we identify the most relevant keywords, error types, and technical terms from your description. This helps us search more effectively through thousands of commits.'
		},
		{
			icon: Search,
			title: 'Repository & Release Discovery',
			description:
				'We fetch all available releases and tags for the SDK to understand version chronology.',
			details:
				'We gather comprehensive release information including release notes, dates, and version numbers to understand what versions exist after yours and map fixes to specific releases.'
		},
		{
			icon: GitCommit,
			title: 'Smart Commit Search',
			description:
				'We search through commit history from your version onwards using the extracted keywords.',
			details:
				"Rather than analyzing every commit (which would be slow and expensive), we use GitHub's search API to find only commits that contain your issue keywords since your version."
		},
		{
			icon: Brain,
			title: 'AI Commit Analysis',
			description:
				'AI evaluates each commit message to determine if it potentially addresses your issue.',
			details:
				'Our AI reads commit messages and determines relevance and likelihood that each commit fixes your specific problem. Only potentially relevant commits proceed to the next step.'
		},
		{
			icon: GitPullRequest,
			title: 'Pull Request Deep Dive',
			description: 'We fetch detailed PR information for commits that might contain fixes.',
			details:
				'For relevant commits, we extract PR numbers and fetch the full PR details including descriptions, discussions, and importantly - which release version each fix shipped in.'
		},
		{
			icon: Zap,
			title: 'Final Analysis & Confidence',
			description:
				'AI combines all findings to determine fix status and provides a confidence score.',
			details:
				'We analyze PR descriptions alongside commit messages, weight the evidence, and provide you with a clear answer: Fixed, Not Fixed, or Unknown, along with a confidence percentage and the specific release versions to upgrade to.'
		}
	];
</script>

<svelte:head>
	<title>How It Works - WTFY</title>
	<meta
		name="description"
		content="Learn how WTFY analyzes your SDK issues using AI and GitHub data to determine if they've been fixed."
	/>
</svelte:head>

<div class="mx-auto w-full max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="mb-4 flex items-center">
			<Button
				variant="secondary"
				size="sm"
				onclick={() => window.history.back()}
				icon={ArrowLeft}
				class="mr-4"
			>
				Back
			</Button>
		</div>

		<div class="text-center">
			<h1 class="mb-4 text-3xl font-bold text-gray-900 dark:text-white">How WTFY Works</h1>
			<p class="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
				WTFY uses advanced AI and GitHub API integration to analyze whether your SDK issues have
				been fixed. Here's exactly how we do it:
			</p>
		</div>
	</div>

	<!-- Analysis Process -->
	<div
		class="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="space-y-8">
			{#each analysisSteps as step, index}
				<div class="flex items-start">
					<!-- Step Icon -->
					<div class="mr-6 flex-shrink-0">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30"
						>
							<svelte:component
								this={step.icon}
								class="h-6 w-6 text-indigo-600 dark:text-indigo-400"
							/>
						</div>
					</div>

					<!-- Step Content -->
					<div class="min-w-0 flex-1">
						<div class="mb-2 flex items-center">
							<h3 class="text-xl font-semibold text-gray-900 dark:text-white">
								{index + 1}. {step.title}
							</h3>
						</div>
						<p class="mb-3 text-base text-gray-700 dark:text-gray-300">
							{step.description}
						</p>
						<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
							<p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
								{step.details}
							</p>
						</div>
					</div>
				</div>

				<!-- Progress Line (except for last step) -->
				{#if index < analysisSteps.length - 1}
					<div class="ml-6 h-8 w-px bg-indigo-200 dark:bg-indigo-800"></div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Key Features -->
	<div class="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
		<div
			class="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20"
		>
			<div class="mb-3 text-green-600 dark:text-green-400">
				<CircleCheck class="h-8 w-8" />
			</div>
			<h4 class="mb-2 text-lg font-semibold text-green-900 dark:text-green-100">
				AI-Powered Accuracy
			</h4>
			<p class="text-sm text-green-800 dark:text-green-200">
				We use GPT-4 to understand context and nuance in both your description and the repository's
				fix history.
			</p>
		</div>

		<div
			class="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20"
		>
			<div class="mb-3 text-blue-600 dark:text-blue-400">
				<Search class="h-8 w-8" />
			</div>
			<h4 class="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">Smart Filtering</h4>
			<p class="text-sm text-blue-800 dark:text-blue-200">
				We only analyze relevant commits and PRs, making the process fast while maintaining
				accuracy.
			</p>
		</div>

		<div
			class="rounded-lg border border-purple-200 bg-purple-50 p-6 dark:border-purple-800 dark:bg-purple-900/20"
		>
			<div class="mb-3 text-purple-600 dark:text-purple-400">
				<GitPullRequest class="h-8 w-8" />
			</div>
			<h4 class="mb-2 text-lg font-semibold text-purple-900 dark:text-purple-100">
				Release Tracking
			</h4>
			<p class="text-sm text-purple-800 dark:text-purple-200">
				We tell you exactly which version contains the fix, so you know exactly where to upgrade to.
			</p>
		</div>
	</div>

	<!-- Call to Action -->
	<div class="mt-12 text-center">
		<div class="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white">
			<h3 class="mb-4 text-2xl font-bold">Ready to Check Your Issues?</h3>
			<p class="mb-6 text-indigo-100">
				Our AI is standing by to analyze your SDK issues and determine if they've been fixed.
			</p>
			<Button
				variant="secondary"
				onclick={() => (window.location.href = '/')}
				class="border-white bg-white text-indigo-600 hover:bg-gray-100"
			>
				Start Analysis
			</Button>
		</div>
	</div>
</div>
