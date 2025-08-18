<script lang="ts">
	import { CircleAlert, CheckCircle } from 'lucide-svelte';

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
			icon: CheckCircle,
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

<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
	<div class="flex items-start space-x-4">
		<div class="flex-shrink-0">
			<IconComponent class="h-8 w-8 {config.iconColor}" />
		</div>
		<div class="flex-1">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
				{config.title}
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
