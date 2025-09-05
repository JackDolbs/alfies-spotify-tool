import SpotifyWebApi from 'spotify-web-api-js';
import PocketBase from 'pocketbase';
import type { SpotifyTrack, SpotifyPlaylist } from './types';

let spotifyApi: SpotifyWebApi.SpotifyWebApiJs | null = null;

async function refreshTokenIfNeeded() {
    try {
        // Test the current token
        await spotifyApi?.getMe();
    } catch (error) {
        if (error.status === 401) {
            // Token expired, refresh it
            const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
            
            // Auth as admin
            await pb.admins.authWithPassword(
                import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
                import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
            );

            // Get current record
            const record = await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION)
                .getOne(import.meta.env.VITE_POCKETBASE_RECORD_ID);

            // Get new access token using refresh token
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: record.spotify_refresh_token,
                    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
                    client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET
                })
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const { access_token } = await response.json();

            // Update token in PocketBase
            await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION)
                .update(record.id, {
                    spotify_access_token: access_token
                });

            // Update Spotify client
            spotifyApi?.setAccessToken(access_token);
        } else {
            throw error;
        }
    }
}

export async function getSpotifyClient() {
    if (!spotifyApi) {
        spotifyApi = new SpotifyWebApi();
        
        // Get token from PocketBase
        const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
        
        await pb.admins.authWithPassword(
            import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
            import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
        );

        const record = await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION)
            .getOne(import.meta.env.VITE_POCKETBASE_RECORD_ID);

        spotifyApi.setAccessToken(record.spotify_access_token);
    }

    await refreshTokenIfNeeded();
    return spotifyApi;
}

// Playlist Operations
export async function getPlaylistTracks(): Promise<SpotifyTrack[]> {
    const spotify = await getSpotifyClient();
    const response = await spotify.getPlaylistTracks(import.meta.env.VITE_PLAYLIST_ID);
    return response.items.map(item => item.track);
}

export async function getPlaylistDetails(): Promise<SpotifyPlaylist> {
    const spotify = await getSpotifyClient();
    return await spotify.getPlaylist(import.meta.env.VITE_PLAYLIST_ID);
}

export async function addTrackToPlaylist(trackUri: string): Promise<void> {
    const spotify = await getSpotifyClient();
    await spotify.addTracksToPlaylist(import.meta.env.VITE_PLAYLIST_ID, [trackUri]);
}

export async function reorderPlaylistTrack(oldPosition: number, newPosition: number): Promise<void> {
    const spotify = await getSpotifyClient();
    await spotify.reorderTracksInPlaylist(
        import.meta.env.VITE_PLAYLIST_ID,
        oldPosition,
        newPosition
    );
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
    const spotify = await getSpotifyClient();
    const response = await spotify.searchTracks(query, { limit: 5 });
    return response.tracks.items;
}
