<script lang="ts">
	import { firestore } from '$lib/firebase';
	import { IIactor, firebaseActor, firebaseUser, userDoc } from '$lib/stores';
	import { errorToast, isVariant, successToast } from '$lib/utils';
	import { doc, setDoc } from 'firebase/firestore';
	import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
	import { modalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import IcpIconWhite from '$lib/icons/IcpIconWhite.svelte';

	/**
	 * @type {import('../../declarations/john_dao/john_dao.did').LoginMethod}
	 */
	export let loginMethod;
	let switchingToII = false;

	// @ts-ignore
	$: other = loginMethod.Other;
	$: {
		if (switchingToII && $IIactor) {
			openSwitchModal();
			switchingToII = false;
		}
	}

	const loginIIModal: ModalSettings = {
		type: 'confirm',
		// Data
		title: 'Login with Internet Identity',
		body: 'To switch your authentication method to Internet Identity you need to login first',
		buttonTextConfirm: 'Login with II',
		// TRUE if confirm pressed, FALSE if cancel pressed
		response: async (r: boolean) => {
			if (r) {
				await IIactor.login();
				switchingToII = true;
			}
		}
	};

	const switchToIIModal: ModalSettings = {
		type: 'confirm',
		// Data
		title: 'Switch to Internet Identity',
		body: "This will switch your authentication method to Internet Identity. This means you won't be able to use the private key associated with your social login anymore",
		buttonTextConfirm: 'Switch to Internet Identity',

		// TRUE if confirm pressed, FALSE if cancel pressed
		response: (r: boolean) => {
			if (r) {
				switchToII();
			}
		}
	};

	function openSwitchModal() {
		if (!$IIactor) {
			modalStore.trigger(loginIIModal);
		} else {
			modalStore.trigger(switchToIIModal);
		}
	}

	async function switchToII() {
		if ($userDoc && $firebaseActor && $IIactor) {
			// set doc to switching to plug
			const userRef = doc(firestore, `users/${$firebaseUser?.uid}`);
			setDoc(
				userRef,
				{
					authMethod: 'switchingToII',
					IIPrincipal: $IIactor.authClient.getIdentity().getPrincipal().toText()
				},
				{ merge: true }
			);
			try {
				let staging_result = await $firebaseActor.stage_new_principal(
					$IIactor.authClient.getIdentity().getPrincipal(),
					{
						II: null
					}
				);
				if ('Err' in staging_result) {
					// display a toaster with the error
					let msg = 'An error occured while trying to stage your new principal: ';
					msg += Object.keys(staging_result.Err)[0];
					errorToast(msg);
					setDoc(
						userRef,
						{
							authMethod: 'firebase'
						},
						{ merge: true }
					);
				}
				const oldIdentity = Secp256k1KeyIdentity.fromParsedJson($userDoc.privateKeyFirebase);
				let update_result = await $IIactor.actor.update_user_principal(oldIdentity.getPrincipal());
				if ('Err' in update_result) {
					// display a toaster with the error
					let msg = 'An error occured while trying to update your principal: ';
					msg += Object.keys(update_result.Err)[0];
					errorToast(msg);
					setDoc(
						userRef,
						{
							authMethod: 'firebase'
						},
						{ merge: true }
					);
				} else {
					// set authMethod to II
					setDoc(
						userRef,
						{
							authMethod: 'II'
						},
						{ merge: true }
					);
					successToast('Switched to Internet Identity');
				}
			} catch (e) {
				console.log(e);
				let msg = 'An error occured trying to contact the IC: ';
				msg += e;
				errorToast(msg);
			}
		}
	}
</script>

{#if isVariant(loginMethod, 'II')}
	<div class="flex items-center space-x-4">
		<IcpIconWhite />
		<div>Internet Identity</div>
	</div>
{:else if isVariant(loginMethod, 'Twitter')}
	<div class="flex  space-x-4 ">
		<div class="flex items-center">
			<div class="ml-1 font-semibold">Twitter / Google</div>
		</div>
		<button class="btn variant-filled" on:click={() => openSwitchModal()}>switch to II</button>
	</div>
{:else if isVariant(loginMethod, 'Other')}
	<div>{other}</div>
{/if}
