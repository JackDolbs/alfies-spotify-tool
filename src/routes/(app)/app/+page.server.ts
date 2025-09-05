import type { PageServerLoad } from './$types';
import { getUserPlaylists, getCurrentUser } from '$lib/spotify/server';

export const load: PageServerLoad = async () => {
    try {
        const [response, currentUser] = await Promise.all([
            getUserPlaylists(),
            getCurrentUser()
        ]);

        if (!response?.items) {
            console.error('No items in playlist response:', response);
            return { playlists: [] };
        }
        
        return {
            playlists: response.items.map(playlist => ({
                id: playlist.id,
                name: playlist.name,
                trackCount: playlist.tracks?.total || 0,
                saves: playlist.followers || 0,
                owner: playlist.owner?.display_name || playlist.owner?.id || 'Unknown',
                imageUrl: playlist.images?.[0]?.url || null,
                canEdit: playlist.owner?.id === currentUser.id
            }))
        };
    } catch (error) {
        console.error('Failed to load playlists:', error);
        return {
            playlists: []
        };
    }
};
