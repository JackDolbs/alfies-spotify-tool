import type { PageServerLoad } from './$types';
import { getUserPlaylists } from '$lib/spotify/server';

export const load: PageServerLoad = async () => {
    try {
        const response = await getUserPlaylists();
        
        return {
            playlists: response.items?.map(playlist => ({
                id: playlist.id,
                name: playlist.name,
                trackCount: playlist.tracks?.total || 0,
                followers: playlist.followers?.total || 0,
                imageUrl: playlist.images?.[0]?.url || null
            })) || []
        };
    } catch (error) {
        console.error('Failed to load playlists:', error);
        return {
            playlists: []
        };
    }
};
