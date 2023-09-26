<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ProposalInfo } from '../../declarations/john_dao/john_dao.did';
	import ProposalCard from './ProposalCard.svelte';

	export let proposalInfo: Array<ProposalInfo>;
	let width = window.innerWidth;
	let nrOfBuckets = sizeToNrOfBuckets(width);

	$: buckets = splitIntoBuckets(proposalInfo, nrOfBuckets);

	function sizeToNrOfBuckets(width: number) {
		if (width < 768) {
			return 1;
		} else if (width < 1280) {
			return 2;
		} else {
			return 3;
		}
	}
	// sm 640px 1
	// md 768px 2
	// xl 1280px 3
	function handleResize() {
		width = window.innerWidth;
		let newNrOfBuckets = sizeToNrOfBuckets(width);
		if (newNrOfBuckets !== nrOfBuckets) {
			nrOfBuckets = newNrOfBuckets;
		}
	}

	function splitIntoBuckets(arr, bucketCount) {
		let buckets = Array.from({ length: bucketCount }, () => []);

		for (let i = 0; i < arr.length; i++) {
			buckets[i % bucketCount].push(arr[i]);
		}

		return buckets;
	}

	onMount(() => {
		window.addEventListener('resize', handleResize);
	});

	onDestroy(() => {
		window.removeEventListener('resize', handleResize);
	});
</script>

<div class="lg mx-auto flex space-x-4 md:max-w-[896px] xl:max-w-[1250px]">
	{#each buckets as bucket}
		<div class="md flex flex-col space-y-2">
			{#each bucket as proposalInfo}
				<ProposalCard {proposalInfo} />
			{/each}
		</div>
	{/each}
</div>
