<script lang="ts">
	import { errorToast, successToast } from '$lib/utils';
	import { actor, proposalStore } from '$lib/stores';
	import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
	import { storage } from '$lib/firebase';
	import type { Tweet } from '../../declarations/john_dao/john_dao.did';
	import imageCompression from 'browser-image-compression';
	import { browser } from '$app/environment';
	import ImageModal from './ImageModal.svelte';
	import { ProgressRadial, modalStore } from '@skeletonlabs/skeleton';

	export let parent: any;

	let text = '';
	let loading: boolean = false;
	let fileInput: HTMLInputElement;
	let imagePreview: string = '';
	let imageBlob: Blob | null = null;
	let showModal = false;
	let reader: FileReader | null = null;
	if (browser) {
		reader = new FileReader();
	}

	const baseurl =
		import.meta.env.MODE == 'development'
			? 'http://127.0.0.1:9199'
			: 'https://firebasestorage.googleapis.com';

	let imagePath: string = '';
	const maxCharacters = 270;
	const allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif'];

	$: loading;
	$: imagePathUrl = imagePath.replaceAll('/', '%2F');
	$: imageUrl = `${baseurl}/v0/b/johndao-4b1d5.appspot.com/o/${imagePathUrl}?alt=media`;
	$: imageButtonClasses = imagePreview !== '' ? 'variant-filled-error' : '';

	const handleCloseModal = () => {
		showModal = false;
	};

	function generateID() {
		return window.crypto.getRandomValues(new Uint32Array(1)).toString();
	}

	async function SubmitTweetProposal() {
		let tweet: Tweet =
			imagePreview === '' ? { Tweet: text } : { ImageTweet: { tweet: text, image_path: imageUrl } };

		console.log('tweet', tweet);

		let result = await $actor?.create_proposal({
			tweet: tweet
		});
		if (!result) {
			errorToast('Not logged in');
		} else if ('Err' in result) {
			errorToast(Object.keys(result.Err)[0]);
		} else {
			successToast('Tweet proposal submitted');
		}
	}

	// Upload file directly as Blob
	const uploadImage = async (file: Blob): Promise<string> => {
		imagePath = `images/${generateID()}`;

		const storageRef = ref(storage, imagePath);
		const uploadTask = uploadBytesResumable(storageRef, file, {
			customMetadata: {
				uploadTime: new Date().toISOString()
			}
		});

		return new Promise((resolve, reject) => {
			uploadTask.on('state_changed', null, reject, async () => {
				const downloadURL = await getDownloadURL(storageRef);
				resolve(downloadURL);
			});
		});
	};

	const submitProposal = async () => {
		try {
			loading = true;
			if (imagePreview && imageBlob) {
				await uploadImage(imageBlob);
			}
			await SubmitTweetProposal();
			loading = false;
			$proposalStore.init();
		} catch (error: any) {
			loading = false;
			errorToast(error.message ?? 'Error submitting proposal');
			console.error(error);
		} finally {
			modalStore.close();
		}
	};

	const selectImage = () => {
		fileInput.click();
	};

	const handleFile = async (e: any) => {
		try {
			const imageFile = e.target.files[0];
			e.target.value = null;
			if (!imageFile) {
				return;
			}

			// Check file type
			if (!allowedFileTypes.includes(imageFile.type)) {
				errorToast('File type should be JPEG, PNG or GIF');
				return;
			}

			let processedFile = imageFile; // default to the original file

			// Only compress if it's not a GIF
			if (imageFile.type !== 'image/gif') {
				let controller = new AbortController();
				let options = {
					maxSizeMB: 1,
					signal: controller.signal
				};
				console.log('uncompressed', imageFile.size / 1024 / 1024);
				processedFile = await imageCompression(imageFile, options);
			}

			const compressedMB = processedFile.size / 1024 / 1024;
			console.log('compressed', compressedMB);

			if (compressedMB > 4) {
				errorToast('Please use a smaller image (max size 4MB)');
				return;
			}
			imageBlob = processedFile;
			imagePreview = URL.createObjectURL(processedFile); // preview image locally
		} catch (error) {
			console.error(error);
		}
	};

	function deleteOrSelectImage(e: any) {
		if (imagePreview === '') {
			selectImage();
		} else {
			imagePreview = '';
			reader?.abort();
			reader = new FileReader();
		}
	}
</script>

{#if $modalStore[0]}
	<div class="card w-[400px] space-y-4 p-4 shadow-xl">
		<header class="text-2xl font-bold">{$modalStore[0].title ?? '(title missing)'}</header>
		<div class="relative">
			<textarea
				class="input h-20 w-full rounded border border-gray-300 p-2"
				bind:value={text}
				rows="3"
			/>
			<div class="mb-4 text-right text-sm">
				{#if text.length > maxCharacters}
					<p class="text-red-500">{text.length - maxCharacters} characters over limit!</p>
				{:else if maxCharacters - text.length < 10}
					<p class="text-orange-500">
						{maxCharacters - text.length} characters left
					</p>
				{:else}
					<p>{maxCharacters - text.length} characters left</p>
				{/if}
			</div>
		</div>
		<div class="flex w-full">
			<button
				class="btn variant-filled-secondary ml-auto {imageButtonClasses}"
				on:click={deleteOrSelectImage}
			>
				{#if imagePreview === ''}
					add image
				{:else}
					delete image
				{/if}
			</button>
		</div>
		<input
			type="file"
			bind:this={fileInput}
			on:change={handleFile}
			class="hidden"
			accept=".jpeg,.jpg,.png,.gif"
		/>
		{#if imagePreview}
			<div class="relative my-6 w-full" style="padding-bottom: 56.25%">
				<button
					class="absolute top-0 left-0 h-full w-full rounded-2xl bg-cover bg-center bg-no-repeat"
					style="background-image: url({imagePreview});"
					on:click={() => (showModal = true)}
				/>
			</div>
		{/if}

		{#if showModal}
			<ImageModal image={imagePreview} on:close={handleCloseModal} />
		{/if}

		<footer class="modal-footer {parent.regionFooter}">
			<button class="btn {parent.buttonNeutral}" on:click={parent.onClose}
				>{parent.buttonTextCancel}</button
			>
			<button class="btn disabled={loading} {parent.buttonPositive}" on:click={submitProposal}>
				{#if loading}
					<ProgressRadial
						stroke={100}
						width="w-4"
						meter="stroke-primary-500"
						track="stroke-primary-500/30"
					/>
				{/if}
				<span>Submit proposal</span>
			</button>
		</footer>
	</div>
{/if}
