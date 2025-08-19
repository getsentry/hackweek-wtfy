<script lang="ts">
	import { History, RotateCcw, Clock, CheckCircle, CircleAlert, CircleX } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { Button, ConfidenceMeter } from '$lib';

	interface HistoryItem {
		id: number;
		sdk: string;
		version: string;
		description: string;
		createdAt: string;
		result: {
			status: 'fixed' | 'not_fixed' | 'unknown';
			confidence: number;
			summary?: string;
			prs?: any[];
		} | null;
	}

	interface Props {
		onPopulateForm: (sdk: string, version: string, description: string) => void;
	}

	let { onPopulateForm }: Props = $props();

	let history = $state<HistoryItem[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function fetchHistory() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/history');
			if (!response.ok) {
				throw new Error('Failed to fetch history');
			}
			
			const data = await response.json();
			history = data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load history';
			console.error('History fetch failed:', err);
		} finally {
			isLoading = false;
		}
	}

	function getStatusIcon(status: string | null) {
		switch (status) {
			case 'fixed': return CheckCircle;
			case 'not_fixed': return CircleX;
			case 'unknown': return CircleAlert;
			default: return Clock; // No result yet
		}
	}

	function getStatusColor(status: string | null) {
		switch (status) {
			case 'fixed': return 'text-green-500';
			case 'not_fixed': return 'text-red-500';
			case 'unknown': return 'text-yellow-500';
			default: return 'text-gray-400';
		}
	}

	function formatRelativeTime(dateString: string): string {
		const now = new Date();
		const date = new Date(dateString);
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	function truncateDescription(description: string, maxLength = 80): string {
		if (description.length <= maxLength) return description;
		return description.substring(0, maxLength) + '...';
	}

	onMount(() => {
		fetchHistory();
	});
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
	<div class="flex items-center justify-between mb-6">
		<div class="flex items-center">
			<History class="h-5 w-5 text-gray-400 mr-2" />
			<h3 class="text-lg font-medium text-gray-900 dark:text-white">
				Recent Analyses
			</h3>
		</div>
		<Button
			variant="secondary"
			size="sm"
			onclick={fetchHistory}
			icon={RotateCcw}
			disabled={isLoading}
		>
			Refresh
		</Button>
	</div>

	{#if isLoading}
		<div class="space-y-3">
			{#each Array(3) as _}
				<div class="animate-pulse flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
					<div class="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
					<div class="flex-1 space-y-2">
						<div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
						<div class="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="text-center py-6">
			<CircleAlert class="h-8 w-8 text-red-400 mx-auto mb-2" />
			<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
		</div>
	{:else if history.length === 0}
		<div class="text-center py-8">
			<History class="h-12 w-12 text-gray-300 mx-auto mb-4" />
			<p class="text-gray-500 dark:text-gray-400">No previous analyses yet</p>
			<p class="text-sm text-gray-400 dark:text-gray-500">Your analysis history will appear here</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each history as item}
				{@const StatusIcon = getStatusIcon(item.result?.status || null)}
				<button
					type="button"
					onclick={() => onPopulateForm(item.sdk, item.version, item.description)}
					class="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
				>
					<div class="flex items-start space-x-3 w-full overflow-hidden">
						<!-- Status Icon -->
						<div class="flex-shrink-0 mt-0.5">
							<StatusIcon class="h-5 w-5 {getStatusColor(item.result?.status || null)}" />
						</div>

						<!-- Content -->
						<div class="flex-1 min-w-0 overflow-hidden">
							<div class="flex items-center justify-between mb-1">
								<div class="flex items-center space-x-2 min-w-0 flex-1">
									<span class="text-sm font-medium text-gray-900 dark:text-white truncate">
										{item.sdk}
									</span>
									<span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded flex-shrink-0">
										v{item.version}
									</span>
								</div>
								<time class="text-xs text-gray-400 flex-shrink-0 ml-2">
									{formatRelativeTime(item.createdAt)}
								</time>
							</div>
							
							<p class="text-sm text-gray-600 dark:text-gray-300 mb-2 break-words">
								{truncateDescription(item.description)}
							</p>

							{#if item.result}
								<div class="flex items-center justify-between overflow-hidden">
									<span class="text-xs font-medium flex-shrink-0 {
										item.result.status === 'fixed' ? 'text-green-600 dark:text-green-400' :
										item.result.status === 'not_fixed' ? 'text-red-600 dark:text-red-400' :
										'text-yellow-600 dark:text-yellow-400'
									}">
										{item.result.status === 'fixed' ? '✅ Fixed' : 
										 item.result.status === 'not_fixed' ? '❌ Not Fixed' : 
										 '❓ Unknown'}
									</span>
									<div class="flex items-center space-x-2 flex-shrink-0 ml-2">
										{#if item.result.prs && item.result.prs.length > 0}
											<span class="text-xs text-gray-500 dark:text-gray-400">
												{item.result.prs.length} PR{item.result.prs.length === 1 ? '' : 's'}
											</span>
										{/if}
										<div class="w-12">
											<ConfidenceMeter 
												confidence={item.result.confidence} 
												size="sm" 
												showLabel={false}
											/>
										</div>
									</div>
								</div>
							{:else}
								<span class="text-xs text-gray-500 dark:text-gray-400">No result yet</span>
							{/if}
						</div>

						<!-- Populate Icon (appears on hover) -->
						<div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
							<RotateCcw class="h-4 w-4 text-gray-400" />
						</div>
					</div>
				</button>
			{/each}
		</div>

		{#if history.length >= 10}
			<div class="mt-4 text-center">
				<p class="text-xs text-gray-500 dark:text-gray-400">
					Showing last 10 analyses
				</p>
			</div>
		{/if}
	{/if}
</div>
