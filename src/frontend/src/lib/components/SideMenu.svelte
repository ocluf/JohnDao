<script>
	import { page } from '$app/stores';
	import AccountIcon from '$lib/icons/AccountIcon.svelte';
	import AccountIconSolid from '$lib/icons/AccountIconSolid.svelte';
	import HomeIcon from '$lib/icons/HomeIcon.svelte';
	import HomeIconSolid from '$lib/icons/HomeIconSolid.svelte';
	import PlusIcon from '$lib/icons/PlusIcon.svelte';
	import RankingIcon from '$lib/icons/RankingIcon.svelte';
	import RankingIconSolid from '$lib/icons/RankingIconSolid.svelte';
	import { canisterUser } from '$lib/stores';
	import { onMount } from 'svelte';

	/**
	 * @type {string | null}
	 */
	let currentPage;

	$: loggedIn = $canisterUser.state === 'user';

	$: {
		console.log($canisterUser.state);
	}

	onMount(() => {
		page.subscribe((value) => {
			currentPage = value.route.id;
		});
	});
</script>

<div
	class="bg-primary top-0 left-0 z-50 hidden h-full w-28  flex-col items-center space-y-10 rounded-lg border-r p-4 sm:fixed sm:flex"
>
	<a href="/" class="flex items-center justify-center"
		><img src="/JohnDao.png" alt="john dao" class="h-10 w-10" />
	</a>
	<a href="/" class="flex items-center justify-center">
		{#if currentPage === '/'}
			<HomeIconSolid classes="h-8 w-8" />
		{:else}
			<a href="/" class="flex items-center justify-center">
				<HomeIcon classes="h-8 w-8" />
			</a>
		{/if}
	</a>
	<a href="/rankings" class="flex items-center justify-center">
		{#if currentPage === '/rankings'}
			<RankingIconSolid classes="h-8 w-8" />
		{:else}
			<RankingIcon classes="h-8 w-8" />
		{/if}
	</a>
	{#if loggedIn}
		<a href="/account" class="flex items-center justify-center">
			{#if currentPage === '/account'}
				<AccountIconSolid classes="h-8 w-8" />
			{:else}
				<AccountIcon classes="h-8 w-8" />
			{/if}
		</a>
	{/if}

	<PlusIcon />
	{#if !loggedIn}
		<div class="mt-auto pt-5">
			<a class="text-twitter mx-auto flex w-20  items-center justify-center  " href="/login">
				<div class="bg-primary w-full rounded-lg border border-gray-300 p-2 text-center ">
					Login
				</div>
			</a>
			<a class="mx-auto mt-3 flex w-20 items-center justify-center" href="/signup">
				<div class="bg-twitter w-full rounded-lg border border-gray-300 p-2 text-center text-white">
					Sign up
				</div>
			</a>
		</div>
	{/if}
</div>
