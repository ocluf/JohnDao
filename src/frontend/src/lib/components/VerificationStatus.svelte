<script>
	import { isVariant } from '$lib/utils';
	import { DB_VERSION } from '@dfinity/auth-client/lib/cjs/storage';

	/**
	 * @type {import('../../declarations/john_dao/john_dao.did').VerificationStatus}
	 */
	export let verificationStatus;
</script>

{#if isVariant(verificationStatus, 'Verified')}
	<div class="font-semibold text-green-600">Verfified</div>
{:else if isVariant(verificationStatus, 'Unverified')}
	<div class="font-semibold text-yellow-600">Pending</div>
{:else if isVariant(verificationStatus, 'Bot')}
	<div class="color-red-600 font-semibold ">Verfication unsuccesful</div>
{/if}
