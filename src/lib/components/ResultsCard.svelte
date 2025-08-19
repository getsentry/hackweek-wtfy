<script lang="ts">
	import { CircleAlert, CircleCheck, Clock, TrendingUp, GitBranch } from 'lucide-svelte';
	import { parseMarkdownLinks } from '$lib/utils/markdown';
	import { ConfidenceMeter, EmptyState } from '$lib';

	interface PullRequest {
		title: string;
		url: string;
		number: number;
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

<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 border border-gray-200 dark:border-gray-700">
	<div class="flex items-start space-x-4">
		<div class="flex-shrink-0">
			<IconComponent class="h-8 w-8 {config.iconColor}" />
		</div>
		<div class="flex-1">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
				{config.title}
			</h2>
			
			<div class="mb-6">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
						Confidence Level
					</span>
					<TrendingUp class="h-4 w-4 text-gray-400" />
				</div>
				<ConfidenceMeter confidence={result.confidence} size="md" />
			</div>

			{#if result.summary}
				<p class="text-gray-600 dark:text-gray-300 mb-4">{@html parseMarkdownLinks(result.summary)}</p>
			{/if}

			{#if result.prs && result.prs.length > 0}
				<div class="border-t border-gray-200 dark:border-gray-700 pt-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-medium text-gray-900 dark:text-white">
							Relevant Pull Requests
						</h3>
						<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200">
							{result.prs.length} found
						</span>
					</div>
					<div class="grid gap-3">
						{#each result.prs as pr, index}
							<a
								href={pr.url}
								target="_blank"
								rel="noopener noreferrer"
								class="group block p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-750 rounded-lg hover:from-indigo-50 hover:to-indigo-100 dark:hover:from-indigo-900/20 dark:hover:to-indigo-900/30 transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md animate-in fade-in-0 slide-in-from-left-2"
								style="animation-delay: {index * 100}ms"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
											#{pr.number}: {pr.title}
										</div>
									</div>
									<Clock class="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors ml-2 flex-shrink-0" />
								</div>
							</a>
						{/each}
					</div>
				</div>
			{:else if result.status !== 'not_fixed'}
				<!-- Show empty state when no PRs found but analysis suggests it might be fixed -->
				<div class="border-t border-gray-200 dark:border-gray-700 pt-6">
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
