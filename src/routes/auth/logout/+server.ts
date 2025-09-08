import { redirect } from '@sveltejs/kit';
import PocketBase from 'pocketbase';

export async function POST() {
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    
    try {
        // First authenticate as admin
        await pb.admins.authWithPassword(
            import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
            import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
        );

        // Get all accounts and delete them
        const records = await pb.collection('spotify_accounts').getFullList();
        await Promise.all(
            records.map(record => pb.collection('spotify_accounts').delete(record.id))
        );

        throw redirect(303, '/auth');
    } catch (err) {
        if (err?.status === 303) {
            throw err;
        }
        console.error('Failed to logout:', err);
        throw redirect(303, '/auth');
    }
}