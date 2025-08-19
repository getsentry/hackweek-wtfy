<script lang="ts">
	import { Search, GitBranch, FileQuestion } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface Props {
		icon?: ComponentType;
		title: string;
		description: string;
		actionText?: string;
		actionUrl?: string;
		class?: string;
	}

	let { 
		icon = FileQuestion,
		title, 
		description, 
		actionText,
		actionUrl,
		class: className = ''
	}: Props = $props();
	
	const IconComponent = icon;
</script>

<div class="text-center py-12 {className}">
	<div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
		<IconComponent class="h-8 w-8 text-gray-400" />
	</div>
	
	<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
		{title}
	</h3>
	
	<p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
		{description}
	</p>
	
	{#if actionText && actionUrl}
		<a 
			href={actionUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
		>
			<Search class="mr-2 h-4 w-4" />
			{actionText}
		</a>
	{/if}
</div>
