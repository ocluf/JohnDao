<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { anonymousActor } from '$lib/utils';
	import { proposalStore } from '$lib/stores';

	let countdown = '';
	let intervalId: string | number | NodeJS.Timer | undefined;
	let endTime: Date;

	const fetchEndTime = async () => {
		let endTimeNanoSec = await anonymousActor().get_round_end_time_nano();
		const endTime = Number(endTimeNanoSec / BigInt(1e6)); // Convert to milliseconds
		return new Date(endTime);
	};

	const formatTime = (time: number) => {
		const hours = Math.floor(time / 3600);
		const minutes = Math.floor((time % 3600) / 60);
		const seconds = Math.floor(time % 60);
		return `${hours}h &nbsp;  ${minutes}m &nbsp; ${seconds}s`;
	};

	onMount(async () => {
		endTime = await fetchEndTime();

		intervalId = setInterval(async () => {
			const now = new Date();
			const difference = endTime.getTime() - now.getTime();

			if (difference < 0) {
				endTime = await fetchEndTime(); // Refresh the end time
				$proposalStore.init();
				countdown = '0h 0m 0s';
			} else {
				countdown = formatTime(Math.floor(difference / 1000));
			}
		}, 1000);
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

<div class="flex flex-col items-center">
	{#if countdown !== ''}
		<p class="p-1 align-text-bottom text-3xl font-semibold">{@html countdown}</p>
	{:else}
		<p class="p-1 text-xl font-semibold text-gray-700">Loading...</p>
	{/if}
</div>
