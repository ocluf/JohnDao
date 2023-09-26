<script lang="ts">
	import { actor, refreshUserInfo } from '$lib/stores';
	import { ProgressRadial, modalStore } from '@skeletonlabs/skeleton';
	import { accountIdentifierToBytes, errorToast, isVariant, successToast } from '$lib/utils';

	export let parent: any;

	let hexString = '';
	let isLoading = false;

	async function submit_account_identitifier() {
		isLoading = true;
		try {
			if (!$actor) {
				errorToast('Not logged in');
				return;
			}
			let result = await $actor.update_account_identifier(accountIdentifierToBytes(hexString));
			if (isVariant(result, 'Err')) {
				errorToast(
					'Submitting of Account Identifier failed. Please make sure your address is valid.'
				);
			}
			await refreshUserInfo($actor);
		} catch (error) {
			console.error('Error:', error);
			errorToast(
				'Submitting of Account Identifier failed. Please make sure your address is valid.'
			);
		} finally {
			isLoading = false;
			modalStore.close();
		}
	}

	// Base Classes
	const cBase = 'card p-4 w-modal shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold';
</script>

{#if $modalStore[0]}
	<div class="modal-example-form {cBase}">
		<header class={cHeader}>{$modalStore[0].title ?? '(title missing)'}</header>
		<article>{$modalStore[0].body ?? '(body missing)'}</article>
		<form class="modal-form border-surface-500 rounded-container-token space-y-4 border p-4">
			<input
				class="input"
				type="text"
				bind:value={hexString}
				placeholder="Enter hexadecimal string.."
			/>
		</form>
		<footer class="modal-footer {parent.regionFooter}">
			<button class="btn {parent.buttonNeutral}" on:click={parent.onClose}
				>{parent.buttonTextCancel}</button
			>
			<button
				class="btn disabled={isLoading} {parent.buttonPositive}"
				on:click={submit_account_identitifier}
			>
				{#if isLoading}
					<ProgressRadial
						stroke={100}
						width="w-4"
						meter="stroke-primary-500"
						track="stroke-primary-500/30"
					/>
				{/if}
				<span>Update Address</span></button
			>
		</footer>
	</div>
{/if}
