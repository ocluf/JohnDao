<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import '@skeletonlabs/skeleton/themes/theme-modern.css';
	import '@skeletonlabs/skeleton/themes/theme-modern.css';
	import '@skeletonlabs/skeleton/styles/skeleton.css';
	import TweetProposalCreator from '$lib/components/TweetProposalCreator.svelte';
	import '../app.css';
	import UsernameUpdater from '$lib/components/UsernameUpdater.svelte';
	import CountDown from '$lib/components/CountDown.svelte';
	import { canisterUser, userDoc } from '$lib/stores';
	import {
		AppShell,
		Modal,
		Toast,
		type ModalComponent,
		type ModalSettings,
		modalStore,
		Drawer,
		drawerStore,
		LightSwitch
	} from '@skeletonlabs/skeleton';
	import HomeIconSolid from '$lib/icons/HomeIconSolid.svelte';
	import AccountIcon from '$lib/icons/AccountIcon.svelte';
	import AccountIconSolid from '$lib/icons/AccountIconSolid.svelte';
	import HomeIcon from '$lib/icons/HomeIcon.svelte';
	import RankingIcon from '$lib/icons/RankingIcon.svelte';
	import RankingIconSolid from '$lib/icons/RankingIconSolid.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { logout } from '$lib/utils';

	$: NotLoggedIn = $canisterUser.state === 'notLoggedIn';

	let currentPage: string | null;

	onMount(() => {
		page.subscribe((value) => {
			currentPage = value.route.id;
		});
	});

	const modalComponentUsername: ModalComponent = {
		// Pass a reference to your custom component
		ref: UsernameUpdater,
		// Add the component properties as key/value pairs
		props: {},
		// Provide a template literal for the default component slot
		slot: ''
	};

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

	const modalComponentRegistry: Record<string, ModalComponent> = {
		accountCreationUsernameModal: modalComponentUsername
	};

	function handleHamburger(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		drawerStore.open();
	}
</script>

{#if $userDoc?.creating_user}
	<div class="fixed z-[9999] h-screen w-screen bg-black opacity-70">
		<div class="flex h-full items-center justify-center">
			<div class="flex items-center justify-center space-x-4">
				<div class="border-primary-500 -mt-1 h-4 w-4 animate-spin rounded-full border-b-4" />
				<p class="text-white">Creating account on canister...</p>
			</div>
		</div>
	</div>
{/if}

<Modal
	regionFooter="flex justify-end space-x-2 flex-wrap"
	buttonNeutral="variant-ghost-surface mt-2"
	buttonPositive="variant-filled mt-2"
	components={modalComponentRegistry}
/>
<Toast position="tr" />
<Drawer position="right" width="w-[300px]">
	<div class="flex h-full flex-col p-4">
		<div class="flex flex-col space-y-8">
			<img src="/JohnDao.png" alt="john dao" class="mx-auto h-20 w-20" />
			<a href="/" class="flex space-x-2"
				><HomeIcon />
				<div>Home</div></a
			>
			<a href="/rankings" class="flex space-x-2"
				><RankingIcon />
				<div>Karma rankings</div></a
			>
			<a href="/account" class="flex space-x-2"
				><AccountIcon />
				<div>Account</div></a
			>
			<LightSwitch />
		</div>
		<div class="mt-10">
			{#if NotLoggedIn}
				<div class="flex flex-col space-y-2 ">
					<a on:click={() => drawerStore.close()} class="btn variant-ghost btn-sm" href="/login"
						>Log in</a
					>
					<a
						on:click={() => drawerStore.close()}
						class="btn variant-filled-primary btn-sm"
						href="/signup">Sign up</a
					>
				</div>
			{:else}
				<div class="flex">
					<button class="btn variant-filled-secondary my-4 " on:click={logout}>Log out</button>
				</div>
			{/if}
		</div>
		<div class="flex h-max flex-grow flex-col">
			<a class="pt- mt-auto" href="/policy">John Dao Policy</a>
		</div>
	</div>
</Drawer>

{#if !$userDoc?.banned}
	<AppShell slotPageContent="bg-transparent">
		<svelte:fragment slot="header">
			<div
				class="mx-auto flex items-center justify-between overflow-hidden rounded-b-lg  p-2 px-0 pb-1  md:max-w-[896px] xl:max-w-[1250px]"
			>
				<div>
					<a
						href="https://twitter.com/JohnDao_gg"
						class="hidden w-fit items-center rounded-full bg-black p-1 px-4 text-white md:flex "
					>
						<div class="flex items-center">
							<div class="ml-1 text-xl">𝕏</div>
							<div class="ml-3">follow @JohnDao_gg</div>
						</div>
					</a>
				</div>
				<div><CountDown /></div>
				<div class="flex items-center">
					<button
						class="btn variant-filled-primary btn-sm hidden h-[36px] items-center py-2 text-lg md:flex"
						on:click={handleCreateProposal}
					>
						+ Create proposal</button
					>
					<button on:click={handleHamburger}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="ml-2 hidden h-10 w-10 md:block"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
							/>
						</svg>
					</button>
				</div>
			</div>
			<div class=" flex justify-center space-x-2 ">
				<div class="badge bg-white">Winner = 0.3 ICP</div>
				<div class="badge bg-white">Voting = 0.7 ICP / number of voters</div>
			</div>
		</svelte:fragment>
		<slot />
		<svelte:fragment slot="footer">
			<div class="md:hidden">
				<nav class="bg-surface-200-700-token grid w-full  grid-cols-3 p-4  ">
					<a href="/" class="flex items-center justify-center">
						{#if currentPage === '/'}
							<HomeIconSolid />
						{:else}
							<a href="/" class="flex items-center justify-center">
								<HomeIcon />
							</a>
						{/if}
					</a>
					<a href="/rankings" class="flex items-center justify-center">
						{#if currentPage === '/rankings'}
							<RankingIconSolid />
						{:else}
							<RankingIcon />
						{/if}
					</a>

					<a href="/account" class="flex items-center justify-center">
						{#if currentPage === '/account'}
							<AccountIconSolid />
						{:else}
							<AccountIcon />
						{/if}
					</a>
				</nav>
			</div>
		</svelte:fragment>
	</AppShell>
{/if}
