<script>
	import HomeIconSolid from '../icons/HomeIconSolid.svelte';
	import { page } from '$app/stores';
	import { canisterUser } from '$lib/stores';
	import { onMount } from 'svelte';
	import HomeIcon from '$lib/icons/HomeIcon.svelte';
	import RankingIconSolid from '$lib/icons/RankingIconSolid.svelte';
	import RankingIcon from '$lib/icons/RankingIcon.svelte';
	import AccountIconSolid from '$lib/icons/AccountIconSolid.svelte';
	import AccountIcon from '$lib/icons/AccountIcon.svelte';

	/**
	 * @type {string | null}
	 */
	let currentPage;

	$: {
		console.log($canisterUser.state);
	}

	onMount(() => {
		page.subscribe((value) => {
			currentPage = value.route.id;
		});
	});
</script>

<div class="sm:hidden">
	<nav
		class="fixed left-0 right-0 bottom-0 z-[100] mx-auto grid h-16  w-full max-w-lg grid-cols-3 border-t border-gray-300 bg-white  "
	>
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
