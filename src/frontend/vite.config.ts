import { sveltekit } from '@sveltejs/kit/vite';
import inject from '@rollup/plugin-inject';
import type { UserConfig } from 'vite';
import { readFileSync } from 'fs';
import { join } from 'path';
import { defineConfig, loadEnv } from 'vite';

const readCanisterIds = ({
	prefix,
	mode
}: {
	prefix?: string;
	mode: string;
}): Record<string, string> => {
	const canisterIdsJsonFile =
		mode === 'development'
			? join(process.cwd(), '..', '..', '.dfx', 'local', 'canister_ids.json')
			: join(process.cwd(), 'canister_ids.json');

	const network = mode === 'development' ? 'local' : 'ic';

	try {
		type Details = {
			ic?: string;
			local?: string;
		};

		const config: Record<string, Details> = JSON.parse(readFileSync(canisterIdsJsonFile, 'utf-8'));

		return Object.entries(config).reduce((acc, current: [string, Details]) => {
			const [canisterName, canisterDetails] = current;

			return {
				...acc,
				[`${prefix ?? ''}${canisterName.toUpperCase()}_CANISTER_ID`]:
					canisterDetails[network as keyof Details]
			};
		}, {});
	} catch (e) {
		throw Error(`Could not get canister ID from ${canisterIdsJsonFile}: ${e}`);
	}
};

const config: UserConfig = {
	plugins: [sveltekit()],
	build: {
		target: 'es2020',
		rollupOptions: {
			// Polyfill Buffer for production build
			plugins: [
				inject({
					modules: { Buffer: ['buffer', 'Buffer'] }
				})
			]
		}
	},
	optimizeDeps: {
		esbuildOptions: {
			// Node.js global to browser globalThis
			define: {
				global: 'globalThis'
			}
		}
	},
	server: {
		host: 'localhost',
		port: 5000,
		strictPort: true,
		cors: true
	}
};

export default defineConfig(({ mode }: UserConfig): UserConfig => {
	const host = mode === 'development' ? 'http://127.0.0.1:8080' : 'https://icp0.io';
	const network = mode === 'development' ? 'local' : 'ic';
	// Expand environment - .env files - with canister IDs
	process.env = {
		...process.env,
		...loadEnv(mode ?? 'development', process.cwd()),
		...readCanisterIds({ prefix: 'VITE_', mode: mode ?? 'dev' }),
		VITE_DFX_NETWORK: network,
		VITE_HOST: host,
		VITE_DEBUG_TOKEN: mode === 'development' ? '5057CE53-5C87-46DE-8005-E7C4DC3BF646' : undefined
	};

	return {
		...config,
		// Backwards compatibility for auto generated types of dfx that are meant for webpack and process.env
		define: {
			'process.env': {
				...readCanisterIds({ mode: mode ?? 'dev' }),
				DFX_NETWORK: network
			}
		}
	};
});
