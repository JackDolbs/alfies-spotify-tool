import SpotifyWebApi from 'spotify-web-api-js';
import PocketBase from 'pocketbase';
import type { SpotifyTrack, SpotifyPlaylist } from './types';
import type { SpotifyAccount } from '../types/pocketbase-types';

interface SpotifyClients {
    [accountId: string]: SpotifyWebApi.SpotifyWebApiJs;
}

const spotifyClients: SpotifyClients = {};

async function refreshTokenIfNeeded(accountId: string) {
    try {
        // Test the current token
        await spotifyClients[accountId]?.getMe();
    } catch (error) {
        if (error.status === 401) {
            // Token expired, refresh it
            const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
            
            // Auth as admin
            await pb.admins.authWithPassword(
                import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
                import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
            );

            // Get current account
            const record = await pb.collection('spotify_accounts').getOne(accountId);

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
            await pb.collection('spotify_accounts').update(accountId, {
                spotify_access_token: access_token
            });

            // Update Spotify client
            spotifyClients[accountId]?.setAccessToken(access_token);
        } else {
            throw error;
        }
    }
}

export async function getSpotifyClient(accountId: string) {
    if (!spotifyClients[accountId]) {
        spotifyClients[accountId] = new SpotifyWebApi();
        
        // Get token from PocketBase
        const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
        
        await pb.admins.authWithPassword(
            import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
            import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
        );

        const record = await pb.collection('spotify_accounts').getOne(accountId);
        spotifyClients[accountId].setAccessToken(record.spotify_access_token);
    }

    await refreshTokenIfNeeded(accountId);
    return spotifyClients[accountId];
}

// Get all connected accounts
export async function getConnectedAccounts(): Promise<SpotifyAccount[]> {
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    await pb.admins.authWithPassword(
        import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
        import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
    );

    const records = await pb.collection('spotify_accounts').getFullList();
    return records;
}

// Playlist Operations
export async function getPlaylistTracks(accountId: string, playlistId: string): Promise<SpotifyTrack[]> {
    const spotify = await getSpotifyClient(accountId);
    const response = await spotify.getPlaylistTracks(playlistId);
    return response.items.map(item => item.track);
}

export async function getPlaylistDetails(accountId: string, playlistId: string): Promise<SpotifyPlaylist> {
    const spotify = await getSpotifyClient(accountId);
    return await spotify.getPlaylist(playlistId);
}

export async function addTrackToPlaylists(trackUri: string, targets: { accountId: string, playlistId: string }[]): Promise<void> {
    // Group targets by account to minimize API client switches
    const targetsByAccount = targets.reduce((acc, target) => {
        if (!acc[target.accountId]) {
            acc[target.accountId] = [];
        }
        acc[target.accountId].push(target.playlistId);
        return acc;
    }, {} as { [accountId: string]: string[] });

    // Add track to each playlist
    for (const [accountId, playlistIds] of Object.entries(targetsByAccount)) {
        const spotify = await getSpotifyClient(accountId);
        await Promise.all(
            playlistIds.map(playlistId => 
                spotify.addTracksToPlaylist(playlistId, [trackUri])
            )
        );
    }
}

export async function reorderPlaylistTrack(accountId: string, playlistId: string, oldPosition: number, newPosition: number): Promise<void> {
    const spotify = await getSpotifyClient(accountId);
    await spotify.reorderTracksInPlaylist(
        playlistId,
        oldPosition,
        newPosition
    );
}

export async function searchTracks(accountId: string, query: string): Promise<SpotifyTrack[]> {
    const spotify = await getSpotifyClient(accountId);
    const response = await spotify.searchTracks(query, { limit: 5 });
    return response.tracks.items;
}