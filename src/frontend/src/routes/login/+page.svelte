<script lang="ts">
	import { goto } from '$app/navigation';
	import { userDoc, IIactor } from '$lib/stores';
	import { errorToast } from '$lib/utils';
	import { loginWithGoogle, loginWithTwitter } from '$lib/firebase';
	import TwitterIconWhite from '$lib/icons/TwitterIconWhite.svelte';
	import IcpIconWhite from '$lib/icons/IcpIconWhite.svelte';
	import { toastStore, type ToastSettings } from '@skeletonlabs/skeleton';

	function loginWithII() {
		try {
			IIactor.login();
		} catch (error) {
			console.error(error);
			errorToast('An error occured while trying to login with II: ' + error);
		}
	}

	async function checkUser() {
		if ($userDoc && $userDoc.authMethod === 'firebase') {
			goto('/');
		}

		if (!$IIactor && $userDoc && $userDoc.authMethod === 'II') {
			errorToast(
				'The authentication method of your account has been switched to Internet Identity please login with II to continue',
				false
			);
		}
		if ($IIactor) {
			let result = await $IIactor.actor.get_user();
			if ('Err' in result) {
				console.log(result.Err);
				const t: ToastSettings = {
					background: 'variant-filled-error',
					message:
						'This Internet Identity has no user associated with it. Please login with twitter of google first and then switch auth method'
				};
				toastStore.trigger(t);
				IIactor.set(null);
			} else {
				goto('/');
			}
		}
	}

	$: {
		if ($IIactor || $userDoc) {
			checkUser();
		}
	}
</script>

<div class="mt-8  flex items-center justify-center lg:mt-[70px]">
	<div class="flex flex-col">
		<button
			on:click={loginWithTwitter}
			class="flex h-10 w-[220px] flex-grow-0 items-center gap-2  rounded-lg border bg-black px-4 py-2 text-center text-gray-50 transition duration-150 hover:border-slate-400 hover:shadow"
		>
			<div class="mr-2 ml-1 text-xl">𝕏</div>
			<div>Login with x</div>
		</button>
		<div class="my-6 h-px w-full rounded-full bg-gray-400" />
		<button
			on:click={loginWithII}
			class="flex h-10 w-[220] flex-grow-0 items-center  gap-2 rounded-lg border border-slate-200  bg-gray-50 px-3 py-2 text-center transition duration-150 hover:border-slate-400 hover:shadow"
		>
			<IcpIconWhite />
			<div class="text-slate-700">Login with II</div>
		</button>
		<div class="text-token mt-1 w-[220px] p-1 text-sm text-gray-500">
			⚠️ To use Internet Identity Sign up with Twitter or Google first and then link your II.
		</div>
	</div>
</div>
