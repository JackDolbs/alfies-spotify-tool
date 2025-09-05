import type { PageServerLoad } from './$types';
import { getUserPlaylists } from '$lib/spotify/server';

export const load: PageServerLoad = async () => {
    try {
        const response = await getUserPlaylists();
        console.log('Playlists response:', response);

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
                imageUrl: playlist.images?.[0]?.url || null
            }))
        };
    } catch (error) {
        console.error('Failed to load playlists:', error);
        return {
            playlists: []
        };
    }
};
