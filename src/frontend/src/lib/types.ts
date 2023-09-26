import type { ActorSubclass, Identity } from '@dfinity/agent';
import type { JsonableSecp256k1Identity } from '@dfinity/identity-secp256k1';
import type { Error, User, _SERVICE } from '../declarations/john_dao/john_dao.did';
import type { AuthClient } from '@dfinity/auth-client';

type AuthMethod = 'firebase' | 'II';

export interface UserDoc {
	name: string | null;
	uid: string;
	creating_user: boolean;
	auth_provider_id: string;
	userCreated: Date;
	confirmedHuman: boolean;
	authMethod: AuthMethod;
	privateKeyFirebase: JsonableSecp256k1Identity;
	canister_user_id?: number;
	user_creation_error?: string;
	banned?: boolean;
}

export type CanisterUser =
	| { state: 'loading' | 'notLoggedIn' }
	| { state: 'error'; error: Error }
	| { state: 'user'; user: User };

export interface Plug {
	browserHasPlug: boolean;
	connected: boolean;
	principal: string | null;
}

export interface IIAuth {
	actor: ActorSubclass<_SERVICE>;
	authClient: AuthClient;
}
