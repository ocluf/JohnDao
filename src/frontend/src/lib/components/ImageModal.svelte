<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let image = '';

	const closeDialog = () => {
		dispatch('close');
	};
</script>

<div class="fixed inset-0 z-[100] flex items-center justify-center">
	<div class="relative w-full max-w-xl overflow-auto rounded bg-white p-4 shadow-lg">
		<button class="absolute right-0 top-0 mr-2 mt-2" on:click={closeDialog}>Close</button>
		<img src={image} alt="preview" class="w-full" />
	</div>
	<button class="fixed inset-0" on:click={closeDialog} />
</div>
