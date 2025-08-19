<script lang="ts">
	interface Props {
		confidence: number;
		size?: 'sm' | 'md' | 'lg';
		showLabel?: boolean;
		class?: string;
	}

	let { 
		confidence, 
		size = 'md',
		showLabel = true,
		class: className = ''
	}: Props = $props();

	const sizes = {
		sm: { bar: 'h-1.5', text: 'text-xs' },
		md: { bar: 'h-2', text: 'text-sm' },
		lg: { bar: 'h-3', text: 'text-base' }
	};

	const sizeConfig = sizes[size];

	// Determine color based on confidence level
	const getColorClass = (conf: number) => {
		if (conf >= 80) return 'bg-green-500';
		if (conf >= 60) return 'bg-yellow-500';
		if (conf >= 40) return 'bg-orange-500';
		return 'bg-red-500';
	};

	const getTextColorClass = (conf: number) => {
		if (conf >= 80) return 'text-green-600 dark:text-green-400';
		if (conf >= 60) return 'text-yellow-600 dark:text-yellow-400';
		if (conf >= 40) return 'text-orange-600 dark:text-orange-400';
		return 'text-red-600 dark:text-red-400';
	};

	const getConfidenceLabel = (conf: number) => {
		if (conf >= 90) return 'Very High';
		if (conf >= 80) return 'High';
		if (conf >= 60) return 'Medium';
		if (conf >= 40) return 'Low';
		return 'Very Low';
	};
</script>

<div class="flex items-center space-x-3 {className}">
	<!-- Progress Bar -->
	<div class="flex-1">
		<div class="bg-gray-200 dark:bg-gray-700 rounded-full {sizeConfig.bar} overflow-hidden">
			<div 
				class="transition-all duration-1000 ease-out {sizeConfig.bar} {getColorClass(confidence)} rounded-full"
				style="width: {confidence}%"
			></div>
		</div>
	</div>
	
	<!-- Confidence Info -->
	{#if showLabel}
		<div class="flex items-center space-x-2 flex-shrink-0">
			<span class="font-medium {getTextColorClass(confidence)} {sizeConfig.text}">
				{confidence}%
			</span>
			<span class="text-gray-500 dark:text-gray-400 {sizeConfig.text}">
				({getConfidenceLabel(confidence)})
			</span>
		</div>
	{/if}
</div>
