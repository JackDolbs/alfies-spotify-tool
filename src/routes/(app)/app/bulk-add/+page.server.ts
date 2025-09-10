import type { PageServerLoad, Actions } from './$types';
import { getAllPlaylists, searchTracks, addTrackToPlaylist } from '$lib/spotify/server';

export const load: PageServerLoad = async () => {
    try {
        // Get all playlists from all accounts
        const playlists = await getAllPlaylists();
        
        return {
            playlists: playlists.map(playlist => ({
                id: playlist.id,
                name: playlist.name,
                owner: playlist.owner?.display_name || playlist.owner?.id || 'Unknown',
                imageUrl: playlist.images?.[0]?.url || null,
                canEdit: playlist.canEdit,
                public: playlist.public,
                collaborative: playlist.collaborative,
                accountId: playlist.accountId,
                accountName: playlist.accountName,
                trackCount: playlist.tracks?.total || 0
            }))
        };
    } catch (error) {
        console.error('Failed to load playlists for bulk add:', error);
        return {
            playlists: []
        };
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

    bulkAdd: async ({ request }) => {
        const data = await request.formData();
        const trackUris = JSON.parse(data.get('trackUris')?.toString() || '[]');
        const playlistIds = JSON.parse(data.get('playlistIds')?.toString() || '[]');

        if (!trackUris.length || !playlistIds.length) {
            return {
                success: false,
                error: 'No tracks or playlists selected'
            };
        }

        try {
            const results = [];
            let successCount = 0;
            let errorCount = 0;

            console.log(`Starting bulk add: ${trackUris.length} tracks to ${playlistIds.length} playlists`);

            // Add each track to each selected playlist
            for (const playlistId of playlistIds) {
                console.log(`Processing playlist: ${playlistId}`);
                
                for (const trackUri of trackUris) {
                    try {
                        console.log(`Adding track ${trackUri} to playlist ${playlistId}`);
                        await addTrackToPlaylist(playlistId, trackUri);
                        successCount++;
                        results.push({
                            playlistId,
                            trackUri,
                            success: true
                        });
                        console.log(`✅ Successfully added track ${trackUri} to playlist ${playlistId}`);
                    } catch (error) {
                        console.error(`❌ Failed to add track ${trackUri} to playlist ${playlistId}:`, error.message);
                        errorCount++;
                        results.push({
                            playlistId,
                            trackUri,
                            success: false,
                            error: error.message
                        });
                    }
                }
            }

            const message = `Successfully added ${successCount} track${successCount === 1 ? '' : 's'}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`;
            console.log(`Bulk add complete: ${message}`);

            return {
                success: true,
                message,
                results,
                stats: {
                    total: trackUris.length * playlistIds.length,
                    success: successCount,
                    errors: errorCount
                }
            };
        } catch (err) {
            console.error('Failed to bulk add tracks:', err);
            return {
                success: false,
                error: 'Failed to bulk add tracks: ' + (err instanceof Error ? err.message : 'Unknown error')
            };
        }
    }
} satisfies Actions;
