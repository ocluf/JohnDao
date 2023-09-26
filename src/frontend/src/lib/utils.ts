import type { ActorSubclass } from '@dfinity/agent';
import type { Error, _SERVICE } from '../declarations/john_dao/john_dao.did';
import { createActor } from '../declarations/john_dao';
import { IIactor, canisterId2, host, refreshUserInfo } from './stores';
import { auth } from './firebase';
import { toastStore, type ToastSettings } from '@skeletonlabs/skeleton';

export async function logout() {
	try {
		await auth.signOut();
		await IIactor.logout();
		refreshUserInfo(null);
	} catch (e) {
		console.log(e);
	}
}

export function isVariant(variant: object, key: string): boolean {
	return variant.hasOwnProperty(key);
}

export function isOk<T>(variant: object | null | undefined): variant is { Ok: T } {
	if (variant === undefined) return false;
	if (variant === null) return false;
	return (variant as { Ok: T }).Ok !== undefined;
}

export function isErr(variant: object): variant is { Err: Error } {
	if (variant === undefined) return false;
	if (variant === null) return false;
	return (variant as { Err: Error }).Err !== undefined;
}

export function anonymousActor(): ActorSubclass<_SERVICE> {
	return createActor(canisterId2, { agentOptions: { host: host } });
}

export function isSome<T>(value: Array<T> | undefined): value is [T] {
	if (!value) return false;
	if (value.length === 0) return false;
	return true;
}

export const accountIdentifierToBytes = (accountIdentifier: string): Uint8Array => {
	let result = [];
	for (let i = 0; i < accountIdentifier.length; i += 2) {
		result.push(parseInt(accountIdentifier.substring(i, i + 2), 16));
	}
	return new Uint8Array(result);
};

export const username = (optionalUsername: [] | [string]): string => {
	return optionalUsername[0] ? optionalUsername[0] : 'Anon';
};

export const accountIdentifierFromBytes = (accountIdentifier: Uint8Array): string => {
	return Array.from(accountIdentifier)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
};

export const errorMsg = (error: Error): string => {
	if ('PaymentError' in error) {
		return error.PaymentError as string;
	} else {
		return Object.keys(error)[0];
	}
};

export function successToast(msg: string) {
	const t: ToastSettings = {
		background: 'variant-filled-success',
		message: msg
	};
	toastStore.trigger(t);
}

export function neutralToast(msg: string) {
	const t: ToastSettings = {
		background: 'variant-filled-secondary',
		message: msg
	};
	toastStore.trigger(t);
}

export function errorToast(msg: string, autohide: boolean = true) {
	const t: ToastSettings = {
		background: 'variant-filled-error',
		message: msg,
		autohide: autohide
	};
	toastStore.trigger(t);
}

export async function getHash(message: string) {
	const msgUint8 = new TextEncoder().encode(message);
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	return hashHex;
}
