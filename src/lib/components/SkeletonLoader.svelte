<script lang="ts">
	interface Props {
		type?: 'text' | 'card' | 'button' | 'circle';
		lines?: number;
		height?: string;
		width?: string;
		class?: string;
	}

	let { 
		type = 'text', 
		lines = 1, 
		height = 'h-4', 
		width = 'w-full',
		class: className = ''
	}: Props = $props();
</script>

{#if type === 'text'}
	<div class="animate-pulse space-y-2 {className}">
		{#each Array(lines) as _, i}
			<div class="bg-gray-200 dark:bg-gray-700 rounded {height} {i === lines - 1 && lines > 1 ? 'w-3/4' : width}"></div>
		{/each}
	</div>
{:else if type === 'card'}
	<div class="animate-pulse bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 {className}">
		<div class="flex items-start space-x-4">
			<div class="bg-gray-200 dark:bg-gray-700 rounded-full h-8 w-8"></div>
			<div class="flex-1 space-y-4">
				<div class="bg-gray-200 dark:bg-gray-700 rounded h-6 w-3/4"></div>
				<div class="bg-gray-200 dark:bg-gray-700 rounded h-4 w-1/4"></div>
				<div class="space-y-2">
					<div class="bg-gray-200 dark:bg-gray-700 rounded h-4 w-full"></div>
					<div class="bg-gray-200 dark:bg-gray-700 rounded h-4 w-5/6"></div>
				</div>
			</div>
		</div>
	</div>
{:else if type === 'button'}
	<div class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md {height} {width} {className}"></div>
{:else if type === 'circle'}
	<div class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full {height} {width} {className}"></div>
{/if}
