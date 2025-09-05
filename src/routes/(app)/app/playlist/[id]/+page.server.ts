import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getPlaylistDetails, getPlaylistTracks, searchTracks, addTrackToPlaylist, removeTrackFromPlaylist, reorderPlaylistTracks, getCurrentUser } from '$lib/spotify/server';

export const load: PageServerLoad = async ({ params }) => {
    try {
        const [playlist, tracks, currentUser] = await Promise.all([
            getPlaylistDetails(params.id),
            getPlaylistTracks(params.id),
            getCurrentUser()
        ]);
        
        return {
            playlist: {
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                followers: playlist.followers?.total || 0,
                imageUrl: playlist.images?.[0]?.url || null,
                owner: playlist.owner?.display_name || playlist.owner?.id || 'Unknown',
                canEdit: playlist.owner?.id === currentUser.id,
                tracks: tracks.items.map((item, index) => ({
                    id: item.track.id,
                    name: item.track.name,
                    artists: item.track.artists.map(artist => artist.name).join(', '),
                    album: item.track.album.name,
                    duration: item.track.duration_ms,
                    uri: item.track.uri,
                    imageUrl: item.track.album.images?.[0]?.url || null,
                    position: index
                })),
                totalDuration: tracks.items.reduce((total, item) => total + item.track.duration_ms, 0)
            }
        };
    } catch (err) {
        console.error('Failed to load playlist:', err);
        throw error(404, 'Playlist not found');
    }
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

    addTrack: async ({ params, request }) => {
        const data = await request.formData();
        const trackUri = data.get('trackUri')?.toString();

        if (!trackUri) {
            return {
                success: false,
                error: 'Track URI is required'
            };
        }

        try {
            await addTrackToPlaylist(params.id, trackUri);
            return {
                success: true,
                message: 'Track added to playlist'
            };
        } catch (err) {
            console.error('Failed to add track:', err);
            return {
                success: false,
                error: 'Failed to add track to playlist'
            };
        }
    },

    removeTrack: async ({ params, request }) => {
        const data = await request.formData();
        const trackUri = data.get('trackUri')?.toString();
        const position = data.get('position')?.toString();

        if (!trackUri) {
            return {
                success: false,
                error: 'Track URI is required'
            };
        }

        try {
            await removeTrackFromPlaylist(params.id, trackUri, position ? parseInt(position) : undefined);
            return {
                success: true,
                message: 'Track removed from playlist'
            };
        } catch (err) {
            console.error('Failed to remove track:', err);
            return {
                success: false,
                error: 'Failed to remove track from playlist'
            };
        }
    },

    reorderTrack: async ({ params, request }) => {
        const data = await request.formData();
        const rangeStart = parseInt(data.get('rangeStart')?.toString() || '0');
        const insertBefore = parseInt(data.get('insertBefore')?.toString() || '0');

        console.log(`Reordering track in playlist ${params.id}: rangeStart=${rangeStart}, insertBefore=${insertBefore}`);

        try {
            const result = await reorderPlaylistTracks(params.id, rangeStart, insertBefore);
            console.log('Spotify reorder result:', result);
            return {
                success: true,
                message: 'Track reordered'
            };
        } catch (err) {
            console.error('Failed to reorder track:', err);
            return {
                success: false,
                error: 'Failed to reorder track'
            };
        }
    }
} satisfies Actions;
