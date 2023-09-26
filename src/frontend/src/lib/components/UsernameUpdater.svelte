<script lang="ts">
	import { actor, canisterUser, refreshUserInfo, userDoc } from '$lib/stores';
	import { errorMsg, errorToast, isVariant, successToast } from '$lib/utils';
	import { ProgressRadial, modalStore } from '@skeletonlabs/skeleton';

	export let parent: any;
	let userName = '';
	let isLoading = false;

	const cBase = 'card p-4 w-modal shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold';

	async function updateUsername(userName: string): any {
		isLoading = true;
		try {
			let result = await $actor?.update_username(userName);
			if (!result) {
				errorToast('Not logged in');
				return;
			}
			if (isVariant(result, 'Err')) {
				errorToast(errorMsg(result.Err));
				return;
			}
		} catch (error) {
			console.error(error);
		} finally {
			isLoading = false;
			modalStore.close();
			refreshUserInfo($actor);
		}
	}
</script>

{#if $modalStore[0]}
	<div class="modal-example-form {cBase}">
		<header class={cHeader}>{$modalStore[0].title ?? '(title missing)'}</header>
		{#if $canisterUser.state == 'user'}
			<article>{$modalStore[0].body ?? '(body missing)'}</article>
			<form class="modal-form border-surface-500 rounded-container-token space-y-4 border p-4">
				<input
					class="input"
					type="text"
					bind:value={userName}
					placeholder="Enter your username.."
				/>
			</form>
		{:else if $canisterUser.state == 'notLoggedIn'}
			Login in to change username
		{:else}
			loading...
		{/if}

		<footer class="modal-footer {parent.regionFooter}">
			<button class="btn {parent.buttonNeutral}" on:click={parent.onClose}
				>{parent.buttonTextCancel}</button
			>
			<button
				class="btn disabled={isLoading} {parent.buttonPositive}"
				on:click={() => updateUsername(userName)}
			>
				{#if isLoading}
					<ProgressRadial
						stroke={100}
						width="w-4"
						meter="stroke-primary-500"
						track="stroke-primary-500/30"
					/>
				{/if}
				<span>Update Username</span></button
			>
		</footer>
	</div>
{/if}
