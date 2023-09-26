<script>
	import { userDoc } from '$lib/stores';
</script>

{#if $userDoc}
	<div class="mb-4 rounded bg-white px-8 pt-6 pb-8 shadow-md">
		{#each Object.entries($userDoc) as [key, value]}
			<div class="mb-4">
				<label class="mb-2 block font-bold text-gray-700" for={key}>
					{key}:
				</label>
				<span class="text-gray-900" id={key}>{JSON.stringify(value)}</span>
			</div>
		{/each}
	</div>
{/if}