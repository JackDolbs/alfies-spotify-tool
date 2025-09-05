import PocketBase from 'pocketbase';
import type { SpotifyTrack, SpotifyPlaylist } from './types';

async function getSpotifyToken() {
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    
    await pb.admins.authWithPassword(
        import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
        import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
    );

    const record = await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION)
        .getOne(import.meta.env.VITE_POCKETBASE_RECORD_ID);

    return record.spotify_access_token;
}

async function spotifyFetch(endpoint: string, options: RequestInit = {}) {
    const token = await getSpotifyToken();
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            // Token expired, refresh it
            // TODO: Implement token refresh
            throw new Error('Token expired');
        }
        throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return response.json();
}

// Playlist Operations
export async function getUserPlaylists() {
    return await spotifyFetch('/me/playlists');
}

export async function createPlaylist(name: string, description?: string) {
    // First get the user's ID
    const user = await spotifyFetch('/me');
    
    // Create the playlist
    return await spotifyFetch(`/users/${user.id}/playlists`, {
        method: 'POST',
        body: JSON.stringify({
            name,
            description,
            public: false // Keep playlists private by default
        })
    });
}

export async function getPlaylistDetails(playlistId: string) {
    return await spotifyFetch(`/playlists/${playlistId}`);
}

export async function getPlaylistTracks(playlistId: string) {
    return await spotifyFetch(`/playlists/${playlistId}/tracks`);
}

export async function addTrackToPlaylist(playlistId: string, trackUri: string) {
    return await spotifyFetch(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
            uris: [trackUri]
        })
    });
}

export async function reorderPlaylistTrack(playlistId: string, oldPosition: number, newPosition: number) {
    return await spotifyFetch(`/playlists/${playlistId}/tracks`, {
        method: 'PUT',
        body: JSON.stringify({
            range_start: oldPosition,
            insert_before: newPosition
        })
    });
}

export async function searchTracks(query: string) {
    return await spotifyFetch(`/search?type=track&q=${encodeURIComponent(query)}&limit=5`);
}
