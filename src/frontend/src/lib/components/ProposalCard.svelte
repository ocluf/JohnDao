<script lang="ts">
	import ReportIcon from '../icons/ReportIcon.svelte';

	import { errorToast, isVariant } from '$lib/utils';
	import numeral from 'numeral';
	import { actor, canisterUser, userDoc } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { proposalStore } from '$lib/stores';
	import { modalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import ReportIconSolid from '$lib/icons/ReportIconSolid.svelte';
	import LoaderIcon from '$lib/icons/LoaderIcon.svelte';
	export let proposalInfo: import('../../declarations/john_dao/john_dao.did').ProposalInfo;

	let voting = false;
	let reportLoading = false;
	let showProposalMenu = false;
	let deleting = false;

	async function upvote() {
		if (!$actor) {
			goto('/login');
			return;
		}
		try {
			voting = true;
			await $actor.vote_for_proposal(proposalInfo.id, { Upvote: null });
			await $proposalStore.init();
			voting = false;
		} catch (error) {
			console.error(error);
			errorToast('Error upvoting proposal' + error);
		}
	}

	async function downvote() {
		if (!$actor) {
			goto('/login');
			return;
		}
		try {
			voting = true;
			await $actor.vote_for_proposal(proposalInfo.id, { Downvote: null });
			await $proposalStore.init();
			voting = false;
		} catch (error) {
			console.error(error);
			errorToast('Error upvoting proposal' + error);
		}
	}

	function formatPoints(points: number) {
		if (points < 1000) {
			return points;
		}
		if (points > 99999) {
			return numeral(points).format('0a');
		}
		let numberString = numeral(points).format('0.0 a');
		return numberString.replace('.0', '');
	}

	const reportModal: ModalSettings = {
		type: 'confirm',
		// Data
		title: 'Report tweet proposal',
		body: "Press report if you believe this proposal doesn't follow the rules in https://help.twitter.com/en/rules-and-policies/twitter-rules. This will hide it from your personal view and put it up for review by a moderator",
		buttonTextConfirm: 'Report',

		// TRUE if confirm pressed, FALSE if cancel pressed
		response: async (r: boolean) => {
			if (r) {
				try {
					reportLoading = true;
					await $actor?.report_proposal(proposalInfo.id);
					$proposalStore.init();
				} catch (error) {
					console.error(error);
				} finally {
					reportLoading = false;
				}
			}
		}
	};

	function report() {
		if (!$actor) {
			goto('/login');
			return;
		}
		try {
			modalStore.trigger(reportModal);
		} catch (error) {
			console.error(error);
		}
	}

	function openProposalMenu() {
		showProposalMenu = true;
	}

	async function deleteProposal() {
		deleting = true;
		try {
			await $actor?.delete_proposal(proposalInfo.id);
			$proposalStore.init();
		} catch (error) {
			console.error(error);
		} finally {
			deleting = false;
		}
	}
</script>

<div class="card pm:border w-full max-w-md break-inside-avoid bg-white p-2 pr-4">
	<div class="grid grid-cols-[60px_minmax(100px,388px)] grid-rows-1">
		<div class=" mx-2 w-14  flex-col items-center">
			<div class="">
				<img src="/JohnDao.png" alt="john dao" class="h-10 w-10" />
			</div>
		</div>
		<div class="flex flex-grow  flex-col">
			<div class="flex items-center">
				<div class="text-header mb-4 pt-1 text-xl">
					John Dao <span class="text-light ml-2 text-sm ">@JohnDao_gg</span>
				</div>
				{#if $canisterUser.user?.id === proposalInfo.created_by}
					<button on:click={openProposalMenu} class="relative mr-2 ml-auto">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-6 w-6"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
							/>
						</svg>
						{#if showProposalMenu}
							<div class="absolute left-0 top-0 z-50 mt-6 mr-2">
								<div class="card w-[200px	] bg-white p-4">
									<button on:click={deleteProposal} class="btn bg-red-500 text-white">
										{#if deleting}
											<LoaderIcon />
										{/if}
										<div class="ml-3">delete proposal</div>
									</button>
								</div>
							</div>
						{/if}
					</button>
				{/if}
			</div>

			{#if isVariant(proposalInfo.tweet, 'Tweet')}
				<div class="text-paragraph mb-4  max-w-full whitespace-pre-line  break-words">
					{proposalInfo.tweet.Tweet}
				</div>
			{/if}
			{#if isVariant(proposalInfo.tweet, 'ImageTweet')}
				<div class="text-paragraph whitespace-pre-line pb-10">
					{proposalInfo.tweet.ImageTweet.tweet}
				</div>
				<div class="relative mb-2 w-full pb-[56.25%]">
					<img
						src={proposalInfo.tweet.ImageTweet.image_path}
						alt="user content"
						class="absolute top-0 left-0 -mt-2 h-full w-full rounded-2xl object-cover"
						loading="lazy"
					/>
				</div>
			{/if}

			<div class="grid w-full grid-cols-4">
				{#if reportLoading}
					<div class="flex items-center py-2">
						<LoaderIcon />
					</div>
				{:else if !proposalInfo.reported}
					<button class="flex items-center py-2" on:click={report}>
						<ReportIcon />
					</button>
				{:else}
					<button class="flex items-center py-2">
						<ReportIconSolid />
					</button>
				{/if}
				<div class="flex items-center py-2" />
				<div class="col-span-2 flex">
					{#if $userDoc?.confirmedHuman}
						<button
							class="m-1 rounded p-1"
							on:click={downvote}
							disabled={voting}
							class:bg-purple-400={isVariant(proposalInfo.upvote_status, 'Downvoted')}
							class:text-primary={isVariant(proposalInfo.upvote_status, 'Downvoted')}
						>
							{#if voting}
								<LoaderIcon />
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="h-6 w-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
									/>
								</svg>
							{/if}
						</button>
					{/if}

					<div
						class="flex flex-1 items-center justify-center text-xl text-gray-500"
						class:text-purple-500={isVariant(proposalInfo.upvote_status, 'Downvoted')}
						class:text-orange-500={isVariant(proposalInfo.upvote_status, 'Upvoted')}
					>
						{formatPoints(proposalInfo.points)}
					</div>
					<button
						class="m-1 rounded p-1"
						on:click={upvote}
						disabled={voting}
						class:bg-orange-400={isVariant(proposalInfo.upvote_status, 'Upvoted')}
						class:text-primary={isVariant(proposalInfo.upvote_status, 'Upvoted')}
					>
						{#if voting}
							<!-- loader icon -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="h-6 w-6 animate-spin"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
								/>
							</svg>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="z-20 h-6 w-6"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
								/>
							</svg>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
