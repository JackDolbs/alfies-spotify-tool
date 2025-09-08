import { redirect } from '@sveltejs/kit';
import PocketBase from 'pocketbase';

export async function GET({ url, cookies }) {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const codeVerifier = cookies.get('spotify_code_verifier');
    const accountName = cookies.get('spotify_account_name');

    if (error) {
        throw new Error(`Spotify auth error: ${error}`);
    }

    if (!code || !codeVerifier || !accountName) {
        throw new Error('Missing required auth parameters');
    }

    try {
        // Exchange code for tokens
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
                client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
                client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET,
                code_verifier: codeVerifier
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Token exchange failed:', error);
            throw new Error('Failed to exchange code for tokens: ' + error);
        }

        const { access_token, refresh_token } = await response.json();

        // Store tokens in PocketBase
        const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
        
        await pb.admins.authWithPassword(
            import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
            import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
        );

        await pb.collection('spotify_accounts').create({
            account_name: accountName,
            spotify_access_token: access_token,
            spotify_refresh_token: refresh_token,
            playlist_ids: [] // Will be populated when playlists are selected
        });

        // Clean up cookies
        cookies.delete('spotify_code_verifier', { path: '/' });
        cookies.delete('spotify_account_name', { path: '/' });

        throw redirect(303, '/app');
    } catch (error) {
        console.error('Auth callback error:', error);
        throw error;
    }
}