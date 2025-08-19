<script lang="ts">
	import { CircleAlert, RefreshCw, ExternalLink } from 'lucide-svelte';
	import { Button } from '$lib';

	interface Props {
		title?: string;
		message: string;
		type?: 'error' | 'warning' | 'info';
		canRetry?: boolean;
		onRetry?: () => void;
		helpLink?: {
			text: string;
			url: string;
		};
	}

	let { 
		title = 'Something went wrong', 
		message, 
		type = 'error',
		canRetry = false,
		onRetry,
		helpLink
	}: Props = $props();

	const typeConfig = {
		error: {
			bgColor: 'bg-red-50 dark:bg-red-900/20',
			borderColor: 'border-red-200 dark:border-red-800',
			iconColor: 'text-red-400',
			titleColor: 'text-red-800 dark:text-red-200',
			messageColor: 'text-red-700 dark:text-red-300'
		},
		warning: {
			bgColor: 'bg-orange-50 dark:bg-orange-900/20',
			borderColor: 'border-orange-200 dark:border-orange-800',
			iconColor: 'text-orange-400',
			titleColor: 'text-orange-800 dark:text-orange-200',
			messageColor: 'text-orange-700 dark:text-orange-300'
		},
		info: {
			bgColor: 'bg-blue-50 dark:bg-blue-900/20',
			borderColor: 'border-blue-200 dark:border-blue-800',
			iconColor: 'text-blue-400',
			titleColor: 'text-blue-800 dark:text-blue-200',
			messageColor: 'text-blue-700 dark:text-blue-300'
		}
	};

	const config = typeConfig[type];
</script>

<div class="rounded-md border {config.bgColor} {config.borderColor} p-4 animate-in slide-in-from-top-2 duration-300">
	<div class="flex">
		<CircleAlert class="h-5 w-5 {config.iconColor} flex-shrink-0" />
		<div class="ml-3 flex-1">
			<h3 class="text-sm font-medium {config.titleColor}">
				{title}
			</h3>
			<p class="mt-1 text-sm {config.messageColor}">
				{message}
			</p>
			
			{#if canRetry || helpLink}
				<div class="mt-4 flex flex-wrap gap-2">
					{#if canRetry && onRetry}
						<Button 
							variant="secondary" 
							size="sm"
							onclick={onRetry}
							icon={RefreshCw}
							class="bg-white dark:bg-gray-800 {config.borderColor}"
						>
							Try Again
						</Button>
					{/if}
					
					{#if helpLink}
						<a 
							href={helpLink.url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md {config.titleColor} hover:opacity-80 transition-opacity"
						>
							<ExternalLink class="mr-1 h-3 w-3" />
							{helpLink.text}
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
