/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		interface Locals {
			pb: import('pocketbase').default;
			user: import('pocketbase').default['authStore']['model'];
		}
		interface Platform {}
	}

	namespace NodeJS {
		interface ProcessEnv {
			POCKETBASE_URL: string;
			POCKETBASE_COLLECTION: string;
			SPOTIFY_CLIENT_ID: string;
			SPOTIFY_CLIENT_SECRET: string;
			SPOTIFY_REDIRECT_URI: string;
			PLAYLIST_ID: string;
		}
	}
}

export {};
