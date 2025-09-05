import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateCodeVerifier, generateCodeChallenge } from '$lib/utils/pkce';

export const GET: RequestHandler = async ({ cookies }) => {
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	// Store the code verifier in a cookie for the callback
	console.log('Login Route Debug - Setting cookie:', {
		codeVerifier,
		codeChallenge
	});

	// Encode the code verifier in the state parameter
	const state = Buffer.from(JSON.stringify({
		codeVerifier,
		timestamp: Date.now()
	})).toString('base64');

	const params = new URLSearchParams({
		client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
		response_type: 'code',
		redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
		code_challenge_method: 'S256',
		code_challenge: codeChallenge,
		scope: 'playlist-modify-private playlist-modify-public playlist-read-private ugc-image-upload',
		state
	});

	throw redirect(307, `https://accounts.spotify.com/authorize?${params.toString()}`);
};
