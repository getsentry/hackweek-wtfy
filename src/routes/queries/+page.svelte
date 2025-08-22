<script lang="ts">
	import { Database, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { Button, QueryListItem, EmptyState, SkeletonLoader } from '$lib';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { queries, pagination } = data;

	function handlePopulateForm(sdk: string, version: string, description: string) {
		// Navigate to main page with query parameters to populate the form
		const params = new URLSearchParams({
			sdk,
			version,
			description: description.substring(0, 500) // Limit description length for URL
		});
		goto(`/?${params.toString()}`);
	}

	function handleShowResult(historyItem: any) {
		// Navigate to main page with the result to display
		// We'll use session storage to pass the result data
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('wtfy_show_result', JSON.stringify(historyItem));
			goto('/');
		}
	}

	function handleRerun(historyItem: any) {
		// Navigate to main page and auto-submit the form
		const params = new URLSearchParams({
			sdk: historyItem.sdk,
			version: historyItem.version,
			description: historyItem.description,
			autoSubmit: 'true'
		});
		goto(`/?${params.toString()}`);
	}

	function navigateToPage(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString());
	}

	// Generate page numbers for pagination
	const pageNumbers = $derived(() => {
		const pages: number[] = [];
		const { currentPage, totalPages } = pagination;

		// Always show first page
		pages.push(1);

		// Show pages around current page
		for (
			let i = Math.max(2, currentPage - 1);
			i <= Math.min(totalPages - 1, currentPage + 1);
			i++
		) {
			if (!pages.includes(i)) {
				pages.push(i);
			}
		}

		// Always show last page if more than 1 page
		if (totalPages > 1 && !pages.includes(totalPages)) {
			pages.push(totalPages);
		}

		return pages.sort((a, b) => a - b);
	});
</script>

<svelte:head>
	<title>All Queries - Was This Fixed Yet?</title>
	<meta name="description" content="Browse all analysis queries submitted to WTFY" />
</svelte:head>

<div class="w-full">
	<!-- Header -->
	<div class="mb-8">
		<div class="mb-4 flex items-center">
			<Database class="mr-3 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Queries</h1>
				<p class="text-gray-600 dark:text-gray-300">
					Browse all {pagination.totalRequests.toLocaleString()} analysis queries
				</p>
			</div>
		</div>
	</div>

	<!-- Pagination Info -->
	<div class="mb-6 flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
		<div class="text-sm text-gray-600 dark:text-gray-400">
			Showing {(pagination.currentPage - 1) * pagination.limit + 1} to {Math.min(
				pagination.currentPage * pagination.limit,
				pagination.totalRequests
			)} of {pagination.totalRequests.toLocaleString()} queries
		</div>
		<div class="text-sm text-gray-500 dark:text-gray-400">
			Page {pagination.currentPage} of {pagination.totalPages}
		</div>
	</div>

	<!-- Queries List -->
	{#if queries.length === 0}
		<EmptyState
			title="No queries found"
			description="No analysis queries have been submitted yet."
			actionText="Start Analysis"
			actionUrl="/"
		/>
	{:else}
		<div class="grid gap-4">
			{#each queries as query}
				<QueryListItem
					item={{
						...query,
						createdAt:
							typeof query.createdAt === 'string' ? query.createdAt : query.createdAt.toISOString()
					}}
					onPopulateForm={handlePopulateForm}
					onShowResult={handleShowResult}
					onRerun={handleRerun}
					compact={false}
				/>
			{/each}
		</div>
	{/if}

	<!-- Pagination Controls -->
	{#if pagination.totalPages > 1}
		<div class="mt-8 flex items-center justify-center">
			<nav class="flex items-center space-x-2" aria-label="Pagination">
				<!-- Previous Page -->
				<Button
					variant="secondary"
					size="sm"
					disabled={!pagination.hasPreviousPage}
					onclick={() => navigateToPage(pagination.currentPage - 1)}
					icon={ChevronLeft}
					class="px-3"
				>
					Previous
				</Button>

				<!-- Page Numbers -->
				<div class="flex items-center space-x-1">
					{#each pageNumbers() as pageNum, i}
						{#if i > 0 && pageNumbers()[i - 1] < pageNum - 1}
							<span class="px-2 text-gray-400">...</span>
						{/if}

						<Button
							variant={pageNum === pagination.currentPage ? 'primary' : 'secondary'}
							size="sm"
							onclick={() => navigateToPage(pageNum)}
							class="w-10 justify-center"
						>
							{pageNum}
						</Button>
					{/each}
				</div>

				<!-- Next Page -->
				<Button
					variant="secondary"
					size="sm"
					disabled={!pagination.hasNextPage}
					onclick={() => navigateToPage(pagination.currentPage + 1)}
					icon={ChevronRight}
					class="px-3"
				>
					Next
				</Button>
			</nav>
		</div>

		<!-- Additional Pagination Info -->
		<div class="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
			{#if pagination.hasNextPage}
				{pagination.totalRequests - pagination.currentPage * pagination.limit} more queries available
			{:else}
				End of results
			{/if}
		</div>
	{/if}
</div>
