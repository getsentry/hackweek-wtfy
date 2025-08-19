<script lang="ts">
	import { CircleCheck, LoaderCircle, Clock } from 'lucide-svelte';

	interface Props {
		currentStep: number;
		steps: Array<{
			title: string;
			description: string;
		}>;
	}

	let { currentStep, steps }: Props = $props();

	function getStepStatus(stepIndex: number) {
		if (stepIndex < currentStep) return 'completed';
		if (stepIndex === currentStep) return 'current';
		return 'pending';
	}
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
	<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-6">
		Analysis Progress
	</h3>
	
	<div class="space-y-4">
		{#each steps as step, index}
			{@const status = getStepStatus(index)}
			<div class="flex items-start">
				<!-- Step Icon -->
				<div class="flex-shrink-0 mr-4">
					{#if status === 'completed'}
						<div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
							<CircleCheck class="w-5 h-5 text-green-600 dark:text-green-400" />
						</div>
					{:else if status === 'current'}
						<div class="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
							<LoaderCircle class="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
						</div>
					{:else}
						<div class="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
							<Clock class="w-5 h-5 text-gray-400" />
						</div>
					{/if}
				</div>
				
				<!-- Step Content -->
				<div class="flex-1 min-w-0">
					<div class="flex items-center">
						<h4 class="text-sm font-medium {
							status === 'completed' ? 'text-green-600 dark:text-green-400' :
							status === 'current' ? 'text-indigo-600 dark:text-indigo-400' : 
							'text-gray-500 dark:text-gray-400'
						}">
							{step.title}
						</h4>
						{#if status === 'completed'}
							<span class="ml-2 text-xs text-green-600 dark:text-green-400">✓</span>
						{/if}
					</div>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						{step.description}
					</p>
				</div>
			</div>
			
			<!-- Progress Line (except for last step) -->
			{#if index < steps.length - 1}
				<div class="ml-4 w-px h-4 {
					status === 'completed' ? 'bg-green-300 dark:bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
				}"></div>
			{/if}
		{/each}
	</div>
</div>
