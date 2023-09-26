<script lang="ts">
	import ProposalCard from '$lib/components/ProposalCard.svelte';
	import { firestore } from '$lib/firebase';
	import { blockList, firebaseUser, proposalStore } from '$lib/stores';

	import { arrayUnion, doc, updateDoc } from 'firebase/firestore';

	$: pstore = $proposalStore;
	$: reported = $pstore
		.filter((p) => p.nr_of_reports > 0)
		.filter((p) => !$blockList?.blocked?.includes(p.id) ?? true)
		.filter((p) => !$blockList?.allowed?.includes(p.id) ?? true)
		.sort((a, b) => b.nr_of_reports - a.nr_of_reports);

	async function addToBlockList(proposalId: number) {
		const blockListRef = doc(firestore, `blocklist/blocklistdoc`);
		await updateDoc(blockListRef, {
			blocked: arrayUnion(proposalId)
		});
	}

	async function addToAllowList(proposalId: number) {
		const blockListRef = doc(firestore, `blocklist/blocklistdoc`);
		await updateDoc(blockListRef, {
			allowed: arrayUnion(proposalId)
		});
	}
</script>

{#if $firebaseUser}
	<!-- A table with the username, link to twitter, and verify user button as columns  -->
	<div class="lg mx-auto mt-4 flex space-x-4 md:max-w-[896px] xl:max-w-[1250px]">
		<div class="md flex flex-col space-y-2">
			{#each reported as proposalInfo}
				<div class="card flex flex-col items-center space-y-4">
					<ProposalCard {proposalInfo} />
					<div class="flex flex-row space-x-4 ">
						<div class="p-4">Reports = {proposalInfo.nr_of_reports}</div>
						<button
							class="btn variant-filled bg-green-500"
							on:click={() => addToAllowList(Number(proposalInfo.id))}
						>
							Approve
						</button>
						<button
							class="btn variant-filled bg-red-500"
							on:click={() => addToBlockList(Number(proposalInfo.id))}
						>
							Hide
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
