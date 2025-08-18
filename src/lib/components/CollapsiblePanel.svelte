<script lang="ts">
	import { ChevronDown, ChevronRight } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface Props {
		title: string;
		isExpanded: boolean;
		variant?: 'warning' | 'info';
		icon?: ComponentType;
		children: any;
		class?: string;
	}

	let { title, isExpanded = $bindable(), variant = 'info', icon, children, class: className = '' }: Props = $props();

	const variants = {
		warning: {
			border: 'border-orange-200 dark:border-orange-800',
			bg: 'bg-orange-50 dark:bg-orange-900/20',
			hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/40',
			text: 'text-orange-800 dark:text-orange-200',
			iconColor: 'text-orange-600 dark:text-orange-400',
			borderDivider: 'border-orange-200 dark:border-orange-800'
		},
		info: {
			border: 'border-indigo-200 dark:border-indigo-800',
			bg: 'bg-indigo-50 dark:bg-indigo-900/20',
			hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
			text: 'text-indigo-900 dark:text-indigo-200',
			iconColor: 'text-indigo-600 dark:text-indigo-400',
			borderDivider: 'border-indigo-200 dark:border-indigo-800'
		}
	};

	const currentVariant = variants[variant];
</script>

<div class="border {currentVariant.border} rounded-lg {currentVariant.bg} {className}">
	<button
		type="button"
		onclick={() => isExpanded = !isExpanded}
		class="w-full px-4 py-3 text-left flex items-center justify-between {currentVariant.hover} rounded-lg transition-colors cursor-pointer"
	>
		<div class="flex items-center">
			{#if icon}
				{@const IconComponent = icon}
				<IconComponent class="h-5 w-5 {currentVariant.iconColor} mr-2" />
			{/if}
			<span class="font-medium {currentVariant.text}">{title}</span>
		</div>
		{#if isExpanded}
			<ChevronDown class="h-4 w-4 {currentVariant.iconColor}" />
		{:else}
			<ChevronRight class="h-4 w-4 {currentVariant.iconColor}" />
		{/if}
	</button>
	
	{#if isExpanded}
		<div class="px-4 pb-4">
			<div class="border-t {currentVariant.borderDivider} pt-3">
				{@render children()}
			</div>
		</div>
	{/if}
</div>
