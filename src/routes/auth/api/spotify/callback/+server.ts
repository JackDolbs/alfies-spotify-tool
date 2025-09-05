import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const code = url.searchParams.get('code');
	const stateParam = url.searchParams.get('state');
	
	let codeVerifier: string | undefined;
	
	if (stateParam) {
		try {
			const stateData = JSON.parse(Buffer.from(stateParam, 'base64').toString());
			codeVerifier = stateData.codeVerifier;
			
			// Verify the timestamp isn't too old (optional)
			const timestamp = stateData.timestamp;
			if (Date.now() - timestamp > 1000 * 60 * 10) { // 10 minutes
				throw error(400, 'Auth state expired');
			}
		} catch (e) {
			console.error('Failed to parse state:', e);
		}
	}
	
	console.log('Callback Route Debug:', {
		code,
		codeVerifier,
		state: stateParam,
		url: url.toString()
	});

	if (!code || !codeVerifier) {
		throw error(400, 'Missing code or code verifier');
	}

	// Exchange code for tokens
	const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
			grant_type: 'authorization_code',
			code,
			redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
			code_verifier: codeVerifier
		})
	});

	if (!tokenResponse.ok) {
		throw error(400, 'Failed to exchange code for tokens');
	}

	const { access_token, refresh_token } = await tokenResponse.json();

	// Create PocketBase instance with admin auth
	const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
	
	// Admin auth with email/password
	await pb.admins.authWithPassword(
		import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
		import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
	);
	
	// Get the record by ID (we'll create this record manually)
	const RECORD_ID = import.meta.env.VITE_POCKETBASE_RECORD_ID;

	console.log('Attempting to update record:', RECORD_ID);
	
	try {
		// Update the record
		await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION).update(RECORD_ID, {
			spotify_access_token: access_token,
			spotify_refresh_token: refresh_token
		});

		console.log('Successfully updated Spotify tokens in PocketBase');
	} catch (err) {
		console.error('Failed to update PocketBase record:', err);
		throw error(500, 'Failed to store Spotify tokens: ' + err.message);
	}

	// Clean up the code verifier cookie
	cookies.delete('code_verifier', { path: '/' });

	// If we got here, everything worked
	console.log('Auth flow completed successfully, redirecting to app...');
	throw redirect(303, '/app');
};
