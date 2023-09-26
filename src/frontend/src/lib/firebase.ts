import { initializeApp } from 'firebase/app';
import {
	connectAuthEmulator,
	signInWithPopup,
	TwitterAuthProvider,
	GoogleAuthProvider,
	type UserCredential
} from 'firebase/auth';
import { getAuth } from 'firebase/auth';

import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, ref } from 'firebase/storage';
import { browser, dev } from '$app/environment';
import type { UserDoc } from './types';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import type { ModalSettings } from '@skeletonlabs/skeleton';
import { modalStore } from '@skeletonlabs/skeleton';
const firebaseConfig = {
	apiKey: 'AIzaSyB4QWP8Csozye2pkInJHY21wXmLnv2M_jg',
	authDomain: 'johndao-4b1d5.firebaseapp.com',
	projectId: 'johndao-4b1d5',
	storageBucket: 'johndao-4b1d5.appspot.com',
	messagingSenderId: '91253186095',
	appId: '1:91253186095:web:280a253d51142dc64a30da'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

if (dev && browser) {
	connectFunctionsEmulator(functions, 'localhost', 5001);
	connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
	connectFirestoreEmulator(firestore, 'localhost', 8081);
	connectStorageEmulator(storage, 'localhost', 9199);
}

const modalUsername: ModalSettings = {
	type: 'component',
	title: 'Set username',
	body: 'Choose a username of max 15 characters',
	buttonTextCancel: 'skip for now',
	buttonTextSubmit: 'set username',
	component: 'accountCreationUsernameModal'
};

async function createNewUser(result: UserCredential) {
	const docRef = doc(firestore, 'users', result.user.uid);
	const docSnap = await getDoc(docRef);

	if (!docSnap.exists()) {
		let newUser: UserDoc = {
			name: result.user.displayName,
			confirmedHuman: false,
			userCreated: new Date(),
			uid: result.user.uid,
			auth_provider_id: result.user.providerData[0].uid,
			privateKeyFirebase: await Secp256k1KeyIdentity.generate().toJSON(),
			authMethod: 'firebase',
			creating_user: true
		};
		await setDoc(doc(firestore, 'users', result.user.uid), newUser);
		modalStore.trigger(modalUsername);
	}
}

export async function loginWithTwitter() {
	try {
		let result = await signInWithPopup(auth, new TwitterAuthProvider());
		await createNewUser(result);
	} catch (e) {
		console.log(e);
	}
}

export async function loginWithGoogle() {
	try {
		let result = await signInWithPopup(auth, new GoogleAuthProvider());
		await createNewUser(result);
	} catch (e) {
		console.log(e);
	}
}
