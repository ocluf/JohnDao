<script lang="ts">
	import { errorMsg, errorToast, isSome, isVariant, successToast } from '$lib/utils';
	import type { User } from '../../declarations/john_dao/john_dao.did';
	import { actor, refreshUserInfo } from '$lib/stores';
	import { ProgressRadial } from '@skeletonlabs/skeleton';

	export let user: User;
	let loading = false;

	$: withdrawable = Number(user.withdrawable_e8s);

	async function withdraw() {
		if (!$actor) {
			errorToast('Not logged in');
			return;
		}
		try {
			loading = true;
			let result = await $actor.claim_reward();
			if (isVariant(result, 'Ok')) {
				successToast('Withdrawal successful');
			} else if ('Err' in result) {
				errorToast('Call to canister failed ' + errorMsg(result.Err));
			}
			refreshUserInfo($actor);
		} catch (e) {
			errorToast('Call to canister failed ' + e);
			console.error(e);
		} finally {
			loading = false;
		}
	}
</script>

{#if withdrawable > 0}
	<div class="font-bold">
		{Number(user.withdrawable_e8s) / 100_000_000} ICP available
		{#if isSome(user.deposit_address)}
			<button on:click={withdraw} class="btn variant-filled-primary mt-2">
				{#if loading}
					<ProgressRadial
						stroke={100}
						width="w-4"
						meter="stroke-surface-50"
						track="stroke-primary-500/30"
					/>
				{/if}
				<span> withdraw</span>
			</button>
		{:else}
			<div class="text-warning-600-300-token">Configure a reward address to claim your ICP</div>
		{/if}
	</div>
{:else}
	<div class="text-token">No withdrawable balance</div>
{/if}
