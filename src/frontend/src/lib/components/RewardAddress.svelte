<script lang="ts">
	import { accountIdentifierFromBytes, isSome } from '$lib/utils';
	import { modalStore, type ModalSettings, type ModalComponent } from '@skeletonlabs/skeleton';
	import RewardAddressUpdater from './RewardAddressUpdater.svelte';

	export let depositAddress: [] | [Uint8Array];

	const modalComponent: ModalComponent = {
		// Pass a reference to your custom component
		ref: RewardAddressUpdater,
		// Add the component properties as key/value pairs
		props: {},
		// Provide a template literal for the default component slot
		slot: ''
	};

	const modal: ModalSettings = {
		type: 'component',
		title: 'Update reward address',
		body: 'If you claim your ICP reward it will be send to this address. You can change it at any time.',
		component: modalComponent
	};

	$: address_string = isSome(depositAddress) ? accountIdentifierFromBytes(depositAddress[0]) : null;
</script>

<div>
	{#if address_string}
		<div class="text-token break-words py-2">{address_string}</div>
	{:else}
		<div class="text-token break-words py-2">No reward address configured</div>
	{/if}
	<button class="btn variant-filled" on:click={() => modalStore.trigger(modal)}
		>update address</button
	>
</div>
