import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import PocketBase from 'pocketbase';

export const load: PageServerLoad = async () => {
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    
    try {
        // First authenticate as admin
        await pb.admins.authWithPassword(
            import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
            import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
        );

        const record = await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION)
            .getOne(import.meta.env.VITE_POCKETBASE_RECORD_ID);

        // Check if we have valid tokens
        if (record.spotify_access_token && record.spotify_refresh_token) {
            throw redirect(303, '/app');
        }
    } catch (err) {
        // If anything fails, go to auth
        console.log('Root redirect to auth:', err);
    }

    throw redirect(303, '/auth');
};