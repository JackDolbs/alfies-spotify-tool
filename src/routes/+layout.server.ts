import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import PocketBase from 'pocketbase';

export const load: LayoutServerLoad = async ({ url }) => {
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    
    try {
        // First authenticate as admin
        await pb.admins.authWithPassword(
            import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
            import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
        );

        // Get all connected accounts
        const records = await pb.collection('spotify_accounts').getFullList();
        const hasSpotifyTokens = records.length > 0;
        
        console.log('Auth Check:', {
            path: url.pathname,
            hasTokens: hasSpotifyTokens
        });

        // Only redirect if no tokens and trying to access protected routes
        if (!hasSpotifyTokens && url.pathname.startsWith('/app')) {
            console.log('No tokens, redirecting to /auth');
            throw redirect(303, '/auth');
        }

        // Don't redirect away from /auth even if we have tokens
        // This allows adding multiple accounts

        return {
            hasSpotifyTokens,
            accounts: records
        };
    } catch (err) {
        // If it's a redirect, just throw it
        if (err?.status === 303) {
            throw err;
        }

        console.error('Failed to check Spotify accounts:', err);
        // If we can't check tokens, assume not authenticated
        if (url.pathname.startsWith('/app')) {
            throw redirect(303, '/auth');
        }
        return { 
            hasSpotifyTokens: false,
            accounts: []
        };
    }
};