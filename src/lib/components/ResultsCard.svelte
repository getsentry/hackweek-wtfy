<script lang="ts">
	import { CircleAlert, CircleCheck, Clock, TrendingUp, GitBranch } from 'lucide-svelte';
	import { parseMarkdownLinks } from '$lib/utils/markdown';
	import { ConfidenceMeter, EmptyState } from '$lib';

	interface PullRequest {
		title: string;
		url: string;
		number: number;
		releaseVersion?: string;
	}

	interface Result {
		status: 'fixed' | 'not_fixed' | 'unknown';
		confidence: number;
		summary?: string;
		prs?: PullRequest[];
	}

	interface Props {
		result: Result;
	}

	let { result }: Props = $props();

	const statusConfig = {
		fixed: {
			icon: CircleCheck,
			iconColor: 'text-green-500',
			title: '🎉 Good News! Likely Fixed'
		},
		not_fixed: {
			icon: CircleAlert,
			iconColor: 'text-red-500',
			title: '😞 Probably Still Broken'
		},
		unknown: {
			icon: CircleAlert,
			iconColor: 'text-yellow-500',
			title: '🤷‍♂️ Unclear'
		}
	};

	const config = statusConfig[result.status];
	const IconComponent = config.icon;
</script>

<div
	class="animate-in fade-in-0 slide-in-from-bottom-4 rounded-lg border border-gray-200 bg-white p-6 shadow-lg duration-500 dark:border-gray-700 dark:bg-gray-800"
>
	<div class="flex items-start space-x-4">
		<div class="flex-shrink-0">
			<IconComponent class="h-8 w-8 {config.iconColor}" />
		</div>
		<div class="flex-1">
			<h2 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
				{config.title}
			</h2>

			<div class="mb-6">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
						Confidence Level
					</span>
					<TrendingUp class="h-4 w-4 text-gray-400" />
				</div>
				<ConfidenceMeter confidence={result.confidence} size="md" />
			</div>

			{#if result.summary}
				<p class="mb-4 text-gray-600 dark:text-gray-300">
					{@html parseMarkdownLinks(result.summary)}
				</p>
			{/if}

			{#if result.prs && result.prs.length > 0}
				<div class="border-t border-gray-200 pt-6 dark:border-gray-700">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-lg font-medium text-gray-900 dark:text-white">
							Relevant Pull Requests
						</h3>
						<span
							class="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200"
						>
							{result.prs.length} found
						</span>
					</div>
					<div class="grid gap-3">
						{#each result.prs as pr, index}
							<a
								href={pr.url}
								target="_blank"
								rel="noopener noreferrer"
								class="group animate-in fade-in-0 slide-in-from-left-2 block rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all duration-200 hover:border-indigo-300 hover:bg-gray-100 hover:shadow-md dark:border-gray-600 dark:bg-gray-700 dark:hover:border-indigo-600 dark:hover:bg-gray-600"
								style="animation-delay: {index * 100}ms"
							>
								<div class="flex items-start justify-between">
									<div class="min-w-0 flex-1 pr-2">
										<div
											class="truncate font-medium text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400"
										>
											#{pr.number}: {pr.title}
										</div>
										{#if pr.releaseVersion}
											<div class="mt-1 flex items-center">
												<span
													class="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200"
												>
													📦 &nbsp;Released in {pr.releaseVersion}
												</span>
											</div>
										{:else}
											<div class="mt-1 flex items-center">
												<span
													class="inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
												>
													🚧 Release version unknown
												</span>
											</div>
										{/if}
									</div>
									<Clock
										class="h-4 w-4 flex-shrink-0 text-gray-400 transition-colors group-hover:text-indigo-500"
									/>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{:else if result.status !== 'not_fixed'}
				<!-- Show empty state when no PRs found but analysis suggests it might be fixed -->
				<div class="border-t border-gray-200 pt-6 dark:border-gray-700">
					<EmptyState
						icon={GitBranch}
						title="No Pull Requests Found"
						description="We found evidence of fixes in commit messages, but couldn't locate specific pull requests with detailed information."
						actionText="Search GitHub Issues"
						actionUrl="https://github.com/getsentry/sentry-javascript/issues"
						class="py-8"
					/>
				</div>
			{/if}
		</div>
	</div>
</div>
