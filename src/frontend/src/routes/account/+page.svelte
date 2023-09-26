<script lang="ts">
	import WithdrawableBalance from '../../lib/components/WithdrawableBalance.svelte';
	import {
		Accordion,
		AccordionItem,
		modalStore,
		type ModalComponent,
		type ModalSettings,
		LightSwitch
	} from '@skeletonlabs/skeleton';
	import { canisterUser } from '$lib/stores';
	import Label from '$lib/components/Label.svelte';
	import LoginMethod from '$lib/components/LoginMethod.svelte';
	import RewardAddress from '$lib/components/RewardAddress.svelte';
	import { logout } from '$lib/utils';
	import { goto } from '$app/navigation';
	import UsernameUpdater from '$lib/components/UsernameUpdater.svelte';

	$: {
		if ($canisterUser.state === 'notLoggedIn') {
			goto('/login');
		}
	}

	const modalComponent: ModalComponent = {
		// Pass a reference to your custom component
		ref: UsernameUpdater,
		// Add the component properties as key/value pairs
		props: {},
		// Provide a template literal for the default component slot
		slot: ''
	};

	const modal: ModalSettings = {
		type: 'component',
		title: 'Update username',
		body: 'Update your username which will be displayed below your tweet proposals',
		component: modalComponent
	};
</script>

<main class="mx-auto max-w-lg bg-transparent p-4">
	<h1 class="text-bold mb-2 text-2xl">Account</h1>
	{#if $canisterUser.state === 'loading'}
		loading..
	{:else if $canisterUser.state === 'notLoggedIn'}
		No current user
	{:else if $canisterUser.state === 'user'}
		<div class="card mb-4 grid grid-cols-2 gap-4 p-4 ">
			<Label>Username</Label>
			<div>
				{($canisterUser.user.user_name[0] !== undefined
					? $canisterUser.user.user_name[0]
					: 'Anon') +
					'#' +
					$canisterUser.user.id}
			</div>
			<Label>Karma</Label>
			<div class="text-cl text-primary-500 font-bold">{$canisterUser.user.karma}</div>

			<Label>ICP balance</Label>
			<WithdrawableBalance user={$canisterUser.user} />
		</div>
		<div class="card p-4">
			<Accordion>
				<AccordionItem closed>
					<svelte:fragment slot="summary">Login Method</svelte:fragment>
					<svelte:fragment slot="content">
						<LoginMethod loginMethod={$canisterUser.user.login_method} />
					</svelte:fragment>
				</AccordionItem>
				<AccordionItem>
					<svelte:fragment slot="summary">Reward Address</svelte:fragment>
					<svelte:fragment slot="content">
						<RewardAddress depositAddress={$canisterUser.user.deposit_address} />
					</svelte:fragment>
				</AccordionItem>
				<AccordionItem>
					<svelte:fragment slot="summary">Username</svelte:fragment>
					<svelte:fragment slot="content">
						<button class="btn variant-filled" on:click={() => modalStore.trigger(modal)}
							>Update username</button
						>
					</svelte:fragment>
				</AccordionItem>
			</Accordion>
		</div>
	{:else if $canisterUser.state === 'error'}
		<div class="text-red-500">{JSON.stringify($canisterUser.error)}</div>
	{:else}
		<div class="text-red-500">Unknown error</div>
	{/if}
	<div class="flex items-center">
		<LightSwitch />
		<button class="btn variant-filled-secondary my-4 ml-auto" on:click={logout}>Log out</button>
	</div>
</main>
