import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';

export const POST: RequestHandler = async () => {
    try {
        const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
        
        // Authenticate as admin to clear the Spotify tokens
        await pb.admins.authWithPassword(
            import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
            import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
        );

        // Clear the Spotify tokens from the record
        await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION).update(
            import.meta.env.VITE_POCKETBASE_RECORD_ID,
            {
                spotify_access_token: '',
                spotify_refresh_token: ''
            }
        );

        console.log('Successfully cleared Spotify tokens');
        
        // Redirect to auth page
        throw redirect(303, '/auth');
    } catch (err) {
        // If it's a redirect, let it pass through
        if (err instanceof Response && err.status === 303) {
            throw err;
        }
        
        console.error('Failed to logout:', err);
        // Even if logout fails, redirect to auth
        throw redirect(303, '/auth');
    }
};
