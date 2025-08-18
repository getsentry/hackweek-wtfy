// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	namespace NodeJS {
		interface ProcessEnv {
			DATABASE_URL: string;
			OPENAI_API_KEY: string;
			GITHUB_TOKEN: string;
			CACHE_TTL_HOURS?: string;
			MAX_REQUESTS_PER_HOUR?: string;
			SENTRY_DSN?: string;
		}
	}
}

export {};
