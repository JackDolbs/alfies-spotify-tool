import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPlaylistDetails, getPlaylistTracks } from '$lib/spotify/server';

export const load: PageServerLoad = async ({ params }) => {
    try {
        const [playlist, tracks] = await Promise.all([
            getPlaylistDetails(params.id),
            getPlaylistTracks(params.id)
        ]);
        
        return {
            playlist: {
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                followers: playlist.followers?.total || 0,
                imageUrl: playlist.images?.[0]?.url || null,
                public: playlist.public,
                tracks: tracks.items.map(item => ({
                    id: item.track.id,
                    name: item.track.name,
                    artists: item.track.artists.map(artist => artist.name).join(', '),
                    album: item.track.album.name,
                    duration: item.track.duration_ms,
                    position: item.track.position
                }))
            }
        };
    } catch (err) {
        console.error('Failed to load playlist:', err);
        throw error(404, 'Playlist not found');
    }
};
