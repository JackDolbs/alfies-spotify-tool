import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import PocketBase from 'pocketbase';

export const load: LayoutServerLoad = async ({ url }) => {
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    
    // Get the record that should contain Spotify tokens
    try {
        // First authenticate as admin
        await pb.admins.authWithPassword(
            import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
            import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
        );

        const record = await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION)
            .getOne(import.meta.env.VITE_POCKETBASE_RECORD_ID);

        // Check if both tokens exist and are non-empty strings
        const hasSpotifyTokens = typeof record.spotify_access_token === 'string' && 
            record.spotify_access_token.length > 0 &&
            typeof record.spotify_refresh_token === 'string' && 
            record.spotify_refresh_token.length > 0;
        
        console.log('Auth Check:', {
            path: url.pathname,
            hasTokens: hasSpotifyTokens
        });

        // Only redirect in specific cases:
        // 1. No tokens and trying to access /app -> go to /auth
        // 2. Has tokens and trying to access /auth -> go to /app
        if (!hasSpotifyTokens && url.pathname.startsWith('/app')) {
            console.log('No tokens, redirecting to /auth');
            throw redirect(303, '/auth');
        } else if (hasSpotifyTokens && url.pathname === '/auth') {
            console.log('Has tokens, redirecting to /app');
            throw redirect(303, '/app');
        }

        return {
            hasSpotifyTokens,
            spotifyTokens: hasSpotifyTokens ? {
                accessToken: record.spotify_access_token,
                refreshToken: record.spotify_refresh_token
            } : null
        };
    } catch (err) {
        // If it's a redirect, just throw it
        if (err?.status === 303) {
            throw err;
        }

        console.error('Failed to check Spotify tokens:', err);
        // If we can't check tokens, assume not authenticated
        if (url.pathname.startsWith('/app')) {
            throw redirect(303, '/auth');
        }
        return { hasSpotifyTokens: false };
    }
};
