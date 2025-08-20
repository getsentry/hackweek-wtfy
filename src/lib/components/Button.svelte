<script lang="ts">
	import type { ComponentType } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		icon?: ComponentType;
		iconPosition?: 'left' | 'right';
		class?: string;
		title?: string;
		onclick?: () => void;
		children: any;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		type = 'button',
		icon,
		iconPosition = 'left',
		class: className = '',
		title,
		onclick,
		children
	}: Props = $props();

	const variants = {
		primary:
			'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 border-transparent',
		secondary:
			'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-indigo-500 border-gray-300 dark:border-gray-600'
	};

	const sizes = {
		sm: 'px-2 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	const baseClasses =
		'inline-flex items-center border font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';
</script>

<button
	{type}
	{disabled}
	{onclick}
	{title}
	class="{baseClasses} {variants[variant]} {sizes[size]} {className}"
>
	{#if icon && iconPosition === 'left'}
		{@const IconComponent = icon}
		<IconComponent class="mr-2 h-4 w-4" />
	{/if}

	{@render children()}

	{#if icon && iconPosition === 'right'}
		{@const IconComponent = icon}
		<IconComponent class="ml-2 h-4 w-4" />
	{/if}
</button>
