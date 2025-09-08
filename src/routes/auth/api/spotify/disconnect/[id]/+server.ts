import { json } from '@sveltejs/kit';
import PocketBase from 'pocketbase';

export async function POST({ params }) {
    const accountId = params.id;

    try {
        const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
        
        await pb.admins.authWithPassword(
            import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
            import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
        );

        await pb.collection('spotify_accounts').delete(accountId);

        return json({ success: true });
    } catch (error) {
        console.error('Failed to disconnect account:', error);
        return json({ error: 'Failed to disconnect account' }, { status: 500 });
    }
}
