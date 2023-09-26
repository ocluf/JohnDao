<script lang="ts">
	import { goto } from '$app/navigation';
	import Masonry from '$lib/components/Masonry.svelte';
	import TweetProposalCreator from '$lib/components/TweetProposalCreator.svelte';
	import { proposalStore, canisterUser, filter, blockList } from '$lib/stores';
	import { type ModalComponent, type ModalSettings, modalStore } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';

	$: pstore = $proposalStore;
	$: sorted = $pstore
		.filter((p) => !p.reported)
		.filter((p) => !$blockList?.blocked?.includes(p.id) ?? true)
		.sort((a, b) => {
			if ($filter === 'best') {
				return b.points - a.points;
			} else {
				return Number(b.created_at - a.created_at);
			}
		});

	let interval: string | number | NodeJS.Timer | undefined;

	onMount(() => {
		interval = setInterval(() => {
			if (pstore) {
				console.log('refreshing proposals');

				pstore.init();
			}
		}, 10000);

		return () => {
			clearInterval(interval);
		};
	});

	const modalComponent: ModalComponent = {
		// Pass a reference to your custom component
		ref: TweetProposalCreator,
		// Add the component properties as key/value pairs
		props: {},
		// Provide a template literal for the default component slot
		slot: ''
	};

	const modal: ModalSettings = {
		type: 'component',
		title: 'Create tweet proposal',
		component: modalComponent
	};

	function handleCreateProposal() {
		if ($canisterUser.state === 'user') {
			modalStore.trigger(modal);
		} else {
			goto('/login');
		}
	}
</script>

<div class="mt-2 flex ">
	<Masonry proposalInfo={sorted} />
</div>
{#if sorted.length === 0}
	<p class="mx-auto mt-5 bg-transparent p-4 text-center text-xl">No proposals posted yet</p>
{:else}
	<p class="mx-auto bg-transparent p-4 text-center text-xl ">No more tweet proposals...</p>
{/if}
<button
	class="bg-primary-500 fixed bottom-20 right-0 z-50 mb-1 mr-4 flex items-center justify-center rounded-full p-3 text-lg text-white shadow-md md:hidden"
	on:click={handleCreateProposal}
>
	Create proposal
</button>
