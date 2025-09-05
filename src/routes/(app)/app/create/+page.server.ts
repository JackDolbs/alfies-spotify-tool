import { error, redirect, type Response } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createPlaylist, searchTracks, addTrackToPlaylist } from '$lib/spotify/server';

export const load: PageServerLoad = async () => {
    // Simple load function to prevent any server errors
    return {
        success: true
    };
};

export const actions = {
    search: async ({ request }) => {
        const data = await request.formData();
        const query = data.get('query')?.toString();

        if (!query) {
            return {
                success: false,
                error: 'Search query is required'
            };
        }

        try {
            const results = await searchTracks(query);
            return {
                success: true,
                tracks: results.tracks.items.map(track => ({
                    id: track.id,
                    name: track.name,
                    artists: track.artists.map(artist => artist.name).join(', '),
                    album: track.album.name,
                    uri: track.uri,
                    duration: track.duration_ms,
                    imageUrl: track.album.images[0]?.url || null
                }))
            };
        } catch (err) {
            console.error('Failed to search tracks:', err);
            return {
                success: false,
                error: 'Failed to search tracks'
            };
        }
    },

    create: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name')?.toString();
        const description = data.get('description')?.toString();
        const trackUrisString = data.get('trackUris')?.toString();

        if (!name) {
            return {
                success: false,
                error: 'Playlist name is required'
            };
        }

        try {
            // Create the playlist first
            const playlist = await createPlaylist(name, description);
            console.log('Created playlist:', playlist);
            
            if (!playlist?.id) {
                throw error(500, 'Failed to get playlist ID from Spotify');
            }

            // Add tracks if any were selected
            if (trackUrisString) {
                const trackUris = JSON.parse(trackUrisString);
                if (trackUris.length > 0) {
                    console.log('Adding tracks to playlist:', trackUris);
                    await addTrackToPlaylist(playlist.id, trackUris);
                }
            }
            
            // Redirect to the new playlist
            throw redirect(303, `/app/playlist/${playlist.id}`);
        } catch (err) {
            console.error('Failed to create playlist:', err);
            return {
                success: false,
                error: 'Failed to create playlist'
            };
        }
    }
} satisfies Actions;