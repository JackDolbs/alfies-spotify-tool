import PocketBase from 'pocketbase';
import type { SpotifyTrack, SpotifyPlaylist } from './types';

async function getSpotifyTokens() {
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    
    await pb.admins.authWithPassword(
        import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
        import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
    );

    const record = await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION)
        .getOne(import.meta.env.VITE_POCKETBASE_RECORD_ID);

    return {
        accessToken: record.spotify_access_token,
        refreshToken: record.spotify_refresh_token
    };
}

async function refreshSpotifyToken(refreshToken: string) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(
                `${import.meta.env.VITE_SPOTIFY_CLIENT_ID}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`
            ).toString('base64')}`
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        })
    });

    if (!response.ok) {
        throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    
    // Update tokens in PocketBase
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    await pb.admins.authWithPassword(
        import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
        import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
    );

    await pb.collection(import.meta.env.VITE_POCKETBASE_COLLECTION).update(
        import.meta.env.VITE_POCKETBASE_RECORD_ID,
        {
            spotify_access_token: data.access_token,
            spotify_refresh_token: data.refresh_token || refreshToken // Refresh token might not be returned
        }
    );

    return data.access_token;
}

async function spotifyFetch(endpoint: string, options: RequestInit = {}) {
    // Get both tokens
    const { accessToken, refreshToken } = await getSpotifyTokens();
    
    // Try the request with the current access token
    let response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    // If unauthorized, try refreshing the token
    if (response.status === 401) {
        console.log('Token expired, refreshing...');
        const newAccessToken = await refreshSpotifyToken(refreshToken);
        
        // Retry the request with the new token
        response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${newAccessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    }

    if (!response.ok) {
        throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return response.json();
}

// Playlist Operations
export async function getUserPlaylists() {
    const response = await spotifyFetch('/me/playlists');
    
    // Get detailed data for each playlist to include saves count
    if (response.items) {
        const detailedPlaylists = await Promise.all(
            response.items.map(async (playlist: any) => {
                try {
                    const details = await spotifyFetch(`/playlists/${playlist.id}`);
                    return {
                        ...playlist,
                        followers: details.followers?.total || 0
                    };
                } catch (error) {
                    console.error(`Failed to get details for playlist ${playlist.id}:`, error);
                    return {
                        ...playlist,
                        followers: 0
                    };
                }
            })
        );
        return { ...response, items: detailedPlaylists };
    }
    
    return response;
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

export async function getCurrentUser() {
    return await spotifyFetch('/me');
}

export async function getPlaylistDetails(playlistId: string) {
    return await spotifyFetch(`/playlists/${playlistId}`);
}

export async function getPlaylistTracks(playlistId: string) {
    return await spotifyFetch(`/playlists/${playlistId}/tracks`);
}

export async function addTrackToPlaylist(playlistId: string, trackUris: string | string[]) {
    const uris = Array.isArray(trackUris) ? trackUris : [trackUris];
    return await spotifyFetch(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
            uris: uris
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
    return await spotifyFetch(`/search?type=track&q=${encodeURIComponent(query)}&limit=20`);
}

export async function removeTrackFromPlaylist(playlistId: string, trackUri: string, position?: number) {
    const body: any = {
        tracks: [{ uri: trackUri }]
    };
    
    // If position is provided, include it for more precise removal
    if (position !== undefined) {
        body.tracks[0].positions = [position];
    }
    
    return await spotifyFetch(`/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        body: JSON.stringify(body)
    });
}

export async function reorderPlaylistTracks(playlistId: string, rangeStart: number, insertBefore: number, rangeLength: number = 1) {
    const body = {
        range_start: rangeStart,
        insert_before: insertBefore,
        range_length: rangeLength
    };
    
    console.log(`Spotify API reorder request:`, body);
    
    // Get tokens manually since reorder endpoint returns empty body
    const { accessToken, refreshToken } = await getSpotifyTokens();
    
    // Try the request with the current access token
    let response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    // If unauthorized, try refreshing the token
    if (response.status === 401) {
        console.log('Token expired for reorder, refreshing...');
        const newAccessToken = await refreshSpotifyToken(refreshToken);
        
        // Retry the request with the new token
        response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${newAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Spotify reorder error (${response.status}):`, errorText);
        throw new Error(`Failed to reorder playlist tracks: ${response.status} ${response.statusText}`);
    }

    console.log('Spotify API reorder response: Success (empty body)');
    // This endpoint returns an empty body on success
    return { success: true };
}

export async function uploadPlaylistCover(playlistId: string, imageBase64: string) {
    // Get tokens for manual fetch since we need different headers
    const { accessToken, refreshToken } = await getSpotifyTokens();
    
    // Try the request with the current access token
    let response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/images`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'image/jpeg'
        },
        body: imageBase64
    });

    // If unauthorized, try refreshing the token
    if (response.status === 401) {
        console.log('Token expired for image upload, refreshing...');
        const newAccessToken = await refreshSpotifyToken(refreshToken);
        
        // Retry the request with the new token
        response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/images`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${newAccessToken}`,
                'Content-Type': 'image/jpeg'
            },
            body: imageBase64
        });
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Spotify image upload error (${response.status}):`, errorText);
        throw new Error(`Failed to upload playlist cover: ${response.status} ${response.statusText}`);
    }

    // This endpoint returns no content on success
    return true;
}
