<script lang="ts">
	import { onMount } from 'svelte';
	import type { User } from '../../declarations/john_dao/john_dao.did';
	import { anonActor } from '$lib/stores';
	import { Table, tableMapperValues } from '@skeletonlabs/skeleton';
	import { username } from '$lib/utils';

	let sourceData: Array<User> = [];
	$: tableData = sourceData.map((user) => {
		return {
			username: username(user.user_name) + '#' + user.id,
			karma: user.karma
		};
	});

	console.log(tableData);

	$: tableSimple = {
		// A list of heading labels.
		head: ['username', 'karma'],
		// The data visibly shown in your table body UI.
		body: tableMapperValues(tableData, ['username', 'karma'])
	};

	onMount(async () => {
		try {
			let result = await anonActor.get_users_by_karma(100);
			console.log('result', result);
			if (result) {
				sourceData = result;
			}
		} catch (e) {
			console.log(e);
		}
	});
</script>

<main class="lg mx-auto mt-4  md:max-w-[896px] xl:max-w-[1250px]">
	<Table source={tableSimple} />
</main>
