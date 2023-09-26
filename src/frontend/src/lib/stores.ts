import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import type { Firestore, Query, CollectionReference, DocumentReference } from 'firebase/firestore';
import { onAuthStateChanged, type Auth, type UserInfo } from 'firebase/auth';
import type { CanisterUser, IIAuth, UserDoc } from './types';
import { auth, firestore } from '$lib/firebase';
import { HttpAgent, type ActorSubclass, type Identity } from '@dfinity/agent';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { canisterId, createActor } from '../declarations/john_dao';
import { AuthClient } from '@dfinity/auth-client';
import type { ProposalInfo, _SERVICE } from '../declarations/john_dao/john_dao.did';
import { anonymousActor, errorToast, isErr, isOk } from './utils';

export const canisterId2 = import.meta.env.VITE_JOHN_DAO_CANISTER_ID;
export const host = import.meta.env.VITE_HOST;

console.log('canisterId', canisterId);
console.log('host', host);
console.log(import.meta.env.MODE);

/**
 * @param  {Firestore} firestore firebase firestore instance
 * @param  {string|DocumentReference} ref document path or reference
 * @param  {any} startWith optional default data
 * @returns a store with realtime updates on document data
 */
export function docStore<T>(firestore: Firestore, ref: string | DocumentReference, startWith?: T) {
	let unsubscribe: () => void;

	// Fallback for SSR
	if (!firestore || !globalThis.window) {
		console.warn('Firestore is not initialized or not in browser');
		const { subscribe } = writable(startWith);
		return {
			subscribe,
			ref: null,
			id: ''
		};
	}

	const docRef = typeof ref === 'string' ? doc(firestore, ref) : ref;

	const { subscribe } = writable<T | null>(startWith, (set) => {
		unsubscribe = onSnapshot(docRef, (snapshot) => {
			set((snapshot.data() as T) ?? null);
		});

		return () => unsubscribe();
	});

	return {
		subscribe,
		ref: docRef,
		id: docRef.id
	};
}

/**
 * @param  {Firestore} firestore firebase firestore instance
 * @param  {string|Query|CollectionReference} ref collection path, reference, or query
 * @param  {[]} startWith optional default data
 * @returns a store with realtime updates on collection data
 */
export function collectionStore<T>(
	firestore: Firestore,
	ref: string | Query | CollectionReference,
	startWith: T[] = []
) {
	let unsubscribe: () => void;

	// Fallback for SSR
	if (!firestore || !globalThis.window) {
		console.warn('Firestore is not initialized or not in browser');
		const { subscribe } = writable(startWith);
		return {
			subscribe,
			ref: null
		};
	}

	const colRef = typeof ref === 'string' ? collection(firestore, ref) : ref;

	const { subscribe } = writable(startWith, (set) => {
		unsubscribe = onSnapshot(colRef, (snapshot) => {
			const data = snapshot.docs.map((s) => {
				return { id: s.id, ref: s.ref, ...s.data() } as T;
			});
			set(data);
		});

		return () => unsubscribe();
	});

	return {
		subscribe,
		ref: colRef
	};
}

/**
 * @param  {Auth} auth firebase auth instance
 * @returns a store with the current firebase user
 */
function firebaseUserStore(auth: Auth) {
	let unsubscribe: () => void;

	if (!auth || !globalThis.window) {
		console.warn('Auth is not initialized on not in browser');
		const { subscribe, set, update } = writable(null);
		return {
			subscribe,
			set,
			update
		};
	}

	const { subscribe, set, update } = writable(auth?.currentUser ?? null, (set) => {
		unsubscribe = onAuthStateChanged(auth, (user) => {
			set(user);
		});

		return () => unsubscribe();
	});

	return {
		set,
		update,
		subscribe
	};
}

type IIAuthStore<T> = Writable<T> & {
	login: () => Promise<void>;
	logout: () => void;
};

function IIactorStore(): IIAuthStore<null | IIAuth> {
	const { subscribe, set, update }: Writable<null | IIAuth> = writable(null);

	const login = async () => {
		const authClient = await AuthClient.create();
		authClient.login({
			identityProvider:
				import.meta.env.MODE == 'development'
					? 'http://localhost:8080/?canisterId=qhbym-qaaaa-aaaaa-aaafq-cai'
					: 'https://identity.ic0.app',
			onSuccess: () => {
				const identity = authClient.getIdentity();
				const agent = new HttpAgent({
					identity,
					host: host
				});
				set({
					authClient,
					actor: createActor(canisterId2, { agent })
				});
			},
			onError: (e) => {
				console.error(e);
				set(null);
			}
		});
	};

	const logout = async () => {
		update((iiAuth) => {
			if (iiAuth) {
				iiAuth.authClient.logout();
				return null;
			}
			return null;
		});
	};

	return {
		update,
		subscribe,
		set,
		login,
		logout
	};
}

export const firebaseUser: Writable<null | UserInfo> = firebaseUserStore(auth);
export const IIactor = IIactorStore();
export const userDoc: Readable<null | UserDoc> = derived(firebaseUser, ($user, set) => {
	return $user ? docStore<UserDoc>(firestore, `users/${$user.uid}`).subscribe(set) : set(null);
});

export const blockList = docStore<any>(firestore, 'blocklist/blocklistdoc');

export const firebaseActor: Readable<null | ActorSubclass<_SERVICE>> = derived(
	userDoc,
	($userDoc) => {
		if ($userDoc) {
			const identity = Secp256k1KeyIdentity.fromParsedJson(
				$userDoc.privateKeyFirebase
			) as unknown as Identity;
			const agent = new HttpAgent({
				identity,
				host: host
			});
			const actor = createActor(canisterId2, { agent });
			return actor;
		}
		return null;
	}
);

export const actor: Readable<ActorSubclass<_SERVICE> | null> = derived(
	[firebaseActor, IIactor, userDoc],
	([$firebaseActor, $IIactor, userDoc]) => {
		if ($firebaseActor && userDoc && userDoc.authMethod === 'firebase') {
			return $firebaseActor;
		}
		if ($IIactor) {
			return $IIactor.actor;
		}

		return null;
	}
);

export const filter = writable<'best' | 'new'>('best');

export const proposalStore = derived(actor, ($actor) => {
	let { subscribe, set, update }: Writable<Array<ProposalInfo>> = writable([]);

	async function init(): Promise<void> {
		let actorToUse;

		if ($actor === null) {
			actorToUse = anonymousActor();
		} else {
			actorToUse = $actor;
		}

		actorToUse
			.get_proposals_info()
			.then((proposals) => {
				console.log(proposals);
				set(proposals);
			})
			.catch((e) => {
				console.error(e);
			});
	}

	init();

	return {
		init,
		subscribe,
		set,
		update
	};
});

export const canisterUser: Writable<CanisterUser> = writable({ state: 'notLoggedIn' });
export const anonActor = anonymousActor();

export const refreshUserInfo = async (actor: ActorSubclass<_SERVICE> | null) => {
	if (actor) {
		try {
			canisterUser.set({ state: 'loading' });
			const result = await actor.get_user();
			if (isOk(result)) {
				canisterUser.set({ state: 'user', user: result.Ok });
			}
			if (isErr(result)) {
				canisterUser.set({ state: 'error', error: result.Err });
			}
		} catch (e) {
			errorToast('Call failed' + e);
			console.error(e);
		}
	} else {
		canisterUser.set({ state: 'notLoggedIn' });
	}
};

actor.subscribe(refreshUserInfo);
