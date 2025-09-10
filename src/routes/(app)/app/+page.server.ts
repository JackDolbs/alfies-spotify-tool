import type { PageServerLoad } from './$types';
import { getAllPlaylists, getConnectedAccounts, getCurrentUser } from '$lib/spotify/server';

export const load: PageServerLoad = async () => {
    try {
        // First get the accounts
        const accounts = await getConnectedAccounts();
        if (accounts.length === 0) {
            return { playlists: [] };
        }

        // Use the first account to get user info
        const [playlists, currentUser] = await Promise.all([
            getAllPlaylists(),
            getCurrentUser(accounts[0].id)
        ]);
        
        return {
            playlists: playlists.map(playlist => ({
                id: playlist.id,
                name: playlist.name,
                trackCount: playlist.tracks?.total || 0,
                saves: playlist.followers || 0,
                owner: playlist.owner?.display_name || playlist.owner?.id || 'Unknown',
                imageUrl: playlist.images?.[0]?.url || null,
                canEdit: playlist.collaborative || playlist.owner?.id === currentUser.id,
                public: playlist.public,
                collaborative: playlist.collaborative,
                accountId: playlist.accountId,
                accountName: playlist.accountName,
                snapshotId: playlist.snapshot_id
            }))
        };
    } catch (error) {
        console.error('Failed to load playlists:', error);
        return {
            playlists: []
        };
    }
};