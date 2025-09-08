import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateCodeVerifier, generateCodeChallenge } from '$lib/utils/pkce';

export const GET: RequestHandler = async ({ url, cookies }) => {
    const accountName = url.searchParams.get('accountName');
    if (!accountName) {
        throw new Error('Account name is required');
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store these for the callback
    cookies.set('spotify_code_verifier', codeVerifier, { path: '/' });
    cookies.set('spotify_account_name', accountName, { path: '/' });

    const params = new URLSearchParams({
        client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        scope: 'playlist-modify-private playlist-modify-public playlist-read-private ugc-image-upload'
    });

    throw redirect(307, `https://accounts.spotify.com/authorize?${params.toString()}`);
};