<script lang="ts">
	import {
		History,
		Clock,
		CheckCircle,
		CircleAlert,
		CircleX,
		Eye,
		Edit3,
		Repeat
	} from 'lucide-svelte';
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
		onShowResult: (historyItem: HistoryItem) => void;
	}

	let { onPopulateForm, onShowResult }: Props = $props();

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
			case 'fixed':
				return CheckCircle;
			case 'not_fixed':
				return CircleX;
			case 'unknown':
				return CircleAlert;
			default:
				return Clock; // No result yet
		}
	}

	function getStatusColor(status: string | null) {
		switch (status) {
			case 'fixed':
				return 'text-green-500';
			case 'not_fixed':
				return 'text-red-500';
			case 'unknown':
				return 'text-yellow-500';
			default:
				return 'text-gray-400';
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

	function truncateDescription(description: string, maxLength = 40): string {
		if (description.length <= maxLength) return description;
		return description.substring(0, maxLength) + '...';
	}

	onMount(() => {
		fetchHistory();
	});

	// Expose refresh function for parent
	export function refresh() {
		fetchHistory();
	}
</script>

<div class="space-y-3">
	{#if isLoading}
		<div class="space-y-2">
			{#each Array(3) as _}
				<div class="animate-pulse rounded bg-gray-50 p-2 dark:bg-gray-700">
					<div class="mb-1 h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-600"></div>
					<div class="h-2 w-1/2 rounded bg-gray-200 dark:bg-gray-600"></div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="py-3 text-center">
			<p class="text-xs text-red-600 dark:text-red-400">{error}</p>
		</div>
	{:else if history.length === 0}
		<div class="py-6 text-center">
			<History class="mx-auto mb-2 h-6 w-6 text-gray-300" />
			<p class="text-xs text-gray-500 dark:text-gray-400">No history yet</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each history as item}
				{@const StatusIcon = getStatusIcon(item.result?.status || null)}
				<div
					class="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
				>
					<!-- Main Content -->
					<div class="mb-3 flex items-start space-x-3">
						<!-- Status Icon -->
						<div class="flex-shrink-0">
							<StatusIcon class="h-4 w-4 {getStatusColor(item.result?.status || null)}" />
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-center justify-between">
								<span class="truncate text-sm font-medium text-gray-900 dark:text-white">
									{item.sdk.replace('sentry-', '')}
								</span>
								<time class="flex-shrink-0 text-xs text-gray-400">
									{formatRelativeTime(item.createdAt)}
								</time>
							</div>

							<div class="mb-2 text-xs text-gray-500 dark:text-gray-400">
								v{item.version}
							</div>

							<p class="mb-2 line-clamp-2 text-xs break-words text-gray-600 dark:text-gray-300">
								{truncateDescription(item.description)}
							</p>

							{#if item.result}
								<div class="flex items-center space-x-3">
									<span
										class="text-xs font-medium {item.result.status === 'fixed'
											? 'text-green-600 dark:text-green-400'
											: item.result.status === 'not_fixed'
												? 'text-red-600 dark:text-red-400'
												: 'text-yellow-600 dark:text-yellow-400'}"
									>
										{item.result.confidence}% confidence
									</span>
									{#if item.result.prs && item.result.prs.length > 0}
										<span class="text-xs text-gray-500 dark:text-gray-400">
											{item.result.prs.length} PR{item.result.prs.length === 1 ? '' : 's'}
										</span>
									{/if}
								</div>
							{:else}
								<span class="text-xs text-gray-500 dark:text-gray-400">Analyzing...</span>
							{/if}
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="flex items-center justify-end space-x-2">
						{#if item.result}
							<!-- View Result -->
							<Button
								variant="secondary"
								size="sm"
								onclick={() => onShowResult(item)}
								title="View result"
								class="h-8 w-8 p-0"
							>
								<Eye class="h-8 w-8" />
							</Button>

							<!-- Edit Query -->
							<Button
								variant="secondary"
								size="sm"
								onclick={() => onPopulateForm(item.sdk, item.version, item.description)}
								title="Edit query"
								class="h-8 w-8 p-0"
							>
								<Edit3 class="h-3 w-3" />
							</Button>

							<!-- Re-run Analysis -->
							<Button
								variant="secondary"
								size="sm"
								onclick={() => {
									onPopulateForm(item.sdk, item.version, item.description);
									// Trigger form submission after a brief delay to allow form population
									setTimeout(() => {
										const form = document.querySelector('#requestForm');
										if (form) {
											(form as HTMLFormElement).requestSubmit();
										}
									}, 100);
								}}
								title="Re-run analysis"
								class="h-8 w-8 p-0"
							>
								<Repeat class="h-3 w-3" />
							</Button>
						{:else}
							<!-- Populate Form (for incomplete analyses) -->
							<Button
								variant="secondary"
								size="sm"
								onclick={() => onPopulateForm(item.sdk, item.version, item.description)}
								title="Edit query"
								class="h-8 w-8 p-0"
							>
								<Edit3 class="h-3 w-3" />
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
