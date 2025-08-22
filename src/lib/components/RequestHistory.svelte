<script lang="ts">
	import { History } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { QueryListItem } from '$lib';

	interface HistoryItem {
		id: string;
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
				<QueryListItem {item} {onPopulateForm} {onShowResult} compact={true} />
			{/each}
		</div>
	{/if}
</div>
