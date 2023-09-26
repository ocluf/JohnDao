<script>
	import { goto } from '$app/navigation';
	import { loginWithGoogle, loginWithTwitter } from '$lib/firebase';
	import TwitterIconWhite from '$lib/icons/TwitterIconWhite.svelte';
	import { userDoc } from '$lib/stores';

	$: {
		if ($userDoc) {
			goto('/');
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
			<div>Signup with x</div>
		</button>
		<!-- <button
			class="mt-4 flex h-10 w-[230px] items-center gap-2 rounded-lg border border-slate-200 bg-gray-50 px-4 py-2 text-slate-700 transition duration-150 hover:border-slate-400 hover:text-slate-900 hover:shadow"
			on:click={loginWithGoogle}
		>
			<img
				class="h-6 w-6"
				src="https://www.svgrepo.com/show/475656/google-color.svg"
				loading="lazy"
				alt="google logo"
			/>
			<span>Sign up with Google</span>
		</button> -->
	</div>
</div>
