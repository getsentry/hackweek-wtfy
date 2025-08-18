<script lang="ts">
	interface Props {
		id: string;
		name: string;
		label: string;
		type?: 'text' | 'select' | 'textarea';
		required?: boolean;
		placeholder?: string;
		value?: string;
		options?: Array<{ value: string; label: string }>;
		rows?: number;
		error?: string | null;
		helper?: string | null;
		class?: string;
		inputClass?: string;
	}

	let { 
		id, 
		name, 
		label, 
		type = 'text', 
		required = false,
		placeholder = '',
		value = $bindable(''),
		options = [],
		rows = 4,
		error = null,
		helper = null,
		class: className = '',
		inputClass = ''
	}: Props = $props();

	const baseInputClasses = 'block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500';
	const errorInputClasses = 'border-orange-300 focus:border-orange-400 focus:ring-orange-200';
</script>

<div class={className}>
	<label for={id} class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
		{label} 
		{#if required}
			<span class="text-orange-500">*</span>
		{/if}
	</label>
	
	{#if type === 'select'}
		<select
			{id}
			{name}
			bind:value
			{required}
			class="{baseInputClasses} {error ? errorInputClasses : ''} {inputClass}"
		>
			<option value="">{placeholder || `Choose ${label.toLowerCase()}...`}</option>
			{#each options as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	{:else if type === 'textarea'}
		<textarea
			{id}
			{name}
			{rows}
			{placeholder}
			{required}
			bind:value
			class="{baseInputClasses} {error ? errorInputClasses : ''} {inputClass}"
		></textarea>
	{:else}
		<input
			{id}
			{name}
			{type}
			{placeholder}
			{required}
			bind:value
			class="{baseInputClasses} {error ? errorInputClasses : ''} {inputClass}"
		/>
	{/if}
	
	{#if error}
		<p class="mt-1 text-sm text-orange-600 dark:text-orange-400">{error}</p>
	{:else if helper}
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{helper}</p>
	{/if}
</div>
