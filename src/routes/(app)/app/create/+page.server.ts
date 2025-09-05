import { error, redirect, type Response } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createPlaylist, searchTracks, addTrackToPlaylist, uploadPlaylistCover } from '$lib/spotify/server';

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
        const playlistImage = data.get('playlist-image') as File | null;

        if (!name) {
            return {
                success: false,
                error: 'Playlist name is required'
            };
        }

        // Validate image if provided
        if (playlistImage && playlistImage.size > 0) {
            // Check file type
            if (!playlistImage.type.startsWith('image/jpeg')) {
                return {
                    success: false,
                    error: 'Image must be a JPEG file'
                };
            }
            
            // Check file size (256KB max for Spotify)
            if (playlistImage.size > 256 * 1024) {
                return {
                    success: false,
                    error: 'Image must be smaller than 256KB'
                };
            }
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
                try {
                    const trackUris = JSON.parse(trackUrisString);
                    console.log('Parsed track URIs:', trackUris);
                    
                    // Filter out any invalid URIs
                    const validTrackUris = trackUris.filter(uri => 
                        typeof uri === 'string' && 
                        uri.startsWith('spotify:track:') && 
                        uri.length > 14
                    );
                    
                    console.log('Valid track URIs:', validTrackUris);
                    
                    if (validTrackUris.length > 0) {
                        console.log('Adding valid tracks to playlist:', validTrackUris);
                        await addTrackToPlaylist(playlist.id, validTrackUris);
                    } else {
                        console.log('No valid track URIs found');
                    }
                } catch (parseError) {
                    console.error('Failed to parse track URIs:', parseError);
                }
            }

            // Upload playlist cover image if provided
            if (playlistImage && playlistImage.size > 0) {
                try {
                    console.log('Uploading playlist cover image...');
                    
                    // Convert image to base64
                    const arrayBuffer = await playlistImage.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    
                    // Upload to Spotify
                    await uploadPlaylistCover(playlist.id, base64);
                    console.log('Successfully uploaded playlist cover');
                } catch (imageError) {
                    console.error('Failed to upload playlist cover:', imageError);
                    // Don't fail the entire operation if image upload fails
                    // The playlist was created successfully, just log the error
                }
            }
            
            // Redirect to the new playlist
            throw redirect(303, `/app/playlist/${playlist.id}`);
        } catch (err) {
            console.error('Error in create action:', err);
            
            // Check if it's a redirect response (which should be allowed to pass through)
            if (err instanceof Response && err.status === 303) {
                throw err;
            }
            
            // Check if it's a SvelteKit redirect object
            if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
                throw err;
            }
            
            return {
                success: false,
                error: 'Failed to create playlist'
            };
        }
    }
} satisfies Actions;