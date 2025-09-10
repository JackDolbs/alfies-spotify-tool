import PocketBase from 'pocketbase';
import type { SpotifyTrack, SpotifyPlaylist } from './types';

async function getSpotifyClient(accountId: string) {
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    
    await pb.admins.authWithPassword(
        import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
        import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
    );

    const record = await pb.collection('spotify_accounts').getOne(accountId);
    console.log('Got Spotify client for account:', { accountId, accountName: record.account_name });

    return {
        accessToken: record.spotify_access_token,
        refreshToken: record.spotify_refresh_token,
        accountName: record.account_name
    };
}

async function refreshSpotifyToken(accountId: string, refreshToken: string) {
    console.log('Refreshing token for account:', accountId);
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
        const error = await response.text();
        console.error('Token refresh failed:', error);
        throw new Error('Failed to refresh token: ' + error);
    }

    const data = await response.json();
    
    // Update token in PocketBase
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    await pb.admins.authWithPassword(
        import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
        import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
    );

    await pb.collection('spotify_accounts').update(accountId, {
        spotify_access_token: data.access_token,
        spotify_refresh_token: data.refresh_token || refreshToken // Refresh token might not be returned
    });

    console.log('Token refreshed successfully for account:', accountId);
    return data.access_token;
}

async function spotifyFetch(accountId: string, endpoint: string, options: RequestInit = {}) {
    // Get tokens for this account
    const { accessToken, refreshToken } = await getSpotifyClient(accountId);
    
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
    if (response.status === 401 || response.status === 403) {
        console.log(`Token expired or invalid for account ${accountId}, refreshing...`);
        const newAccessToken = await refreshSpotifyToken(accountId, refreshToken);
        
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
        const errorText = await response.text();
        console.error(`Spotify API error (${response.status}):`, errorText);
        throw new Error(`Spotify API error: ${response.statusText} - ${errorText}`);
    }

    return response.json();
}

// Get all connected accounts
export async function getConnectedAccounts() {
    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
    await pb.admins.authWithPassword(
        import.meta.env.VITE_POCKETBASE_ADMIN_EMAIL,
        import.meta.env.VITE_POCKETBASE_ADMIN_PASSWORD
    );

    const accounts = await pb.collection('spotify_accounts').getFullList();
    console.log('Found connected accounts:', accounts.map(a => ({ id: a.id, name: a.account_name })));
    return accounts;
}

// Get playlists for all accounts
export async function getAllPlaylists() {
    const accounts = await getConnectedAccounts();
    console.log(`Getting playlists for ${accounts.length} accounts...`);
    
    const allPlaylists = await Promise.all(
        accounts.map(async (account) => {
            try {
                console.log(`Fetching playlists for account: ${account.account_name}`);
                
                // First verify the account's token by getting user profile
                await spotifyFetch(account.id, '/me');
                
                // Then get playlists
                const response = await spotifyFetch(account.id, '/me/playlists');
                console.log(`Found ${response.items?.length || 0} playlists for account ${account.account_name}`);
                
                // Get detailed data for each playlist
                if (response.items) {
                    const detailedPlaylists = await Promise.all(
                        response.items.map(async (playlist: any) => {
                            try {
                                const details = await spotifyFetch(account.id, `/playlists/${playlist.id}`);
                                return {
                                    ...playlist,
                                    followers: details.followers?.total || 0,
                                    accountId: account.id,
                                    accountName: account.account_name
                                };
                            } catch (error) {
                                console.error(`Failed to get details for playlist ${playlist.id}:`, error);
                                return {
                                    ...playlist,
                                    followers: 0,
                                    accountId: account.id,
                                    accountName: account.account_name
                                };
                            }
                        })
                    );
                    return detailedPlaylists;
                }
                return [];
            } catch (error) {
                console.error(`Failed to get playlists for account ${account.account_name}:`, error);
                return [];
            }
        })
    );

    // Flatten the array of arrays into a single array of playlists
    const flattened = allPlaylists.flat();
    console.log(`Total playlists found across all accounts: ${flattened.length}`);
    return flattened;
}

export async function getCurrentUser(accountId?: string) {
    // If no accountId provided, use the first available account
    if (!accountId) {
        const accounts = await getConnectedAccounts();
        if (accounts.length === 0) {
            throw new Error('No connected accounts found');
        }
        accountId = accounts[0].id;
    }
    return await spotifyFetch(accountId, '/me');
}

export async function getPlaylistDetails(playlistId: string, accountId?: string) {
    // If no accountId provided, try to find which account has access to this playlist
    if (!accountId) {
        const accounts = await getConnectedAccounts();
        
        // Try each account until we find one that can access this playlist
        for (const account of accounts) {
            try {
                const result = await spotifyFetch(account.id, `/playlists/${playlistId}`);
                return result;
            } catch (error) {
                console.log(`Account ${account.account_name} cannot access playlist ${playlistId}:`, error);
                continue;
            }
        }
        throw new Error(`No account has access to playlist ${playlistId}`);
    }
    return await spotifyFetch(accountId, `/playlists/${playlistId}`);
}

export async function getPlaylistTracks(playlistId: string, accountId?: string) {
    // If no accountId provided, try to find which account has access to this playlist
    if (!accountId) {
        const accounts = await getConnectedAccounts();
        
        // Try each account until we find one that can access this playlist
        for (const account of accounts) {
            try {
                const result = await spotifyFetch(account.id, `/playlists/${playlistId}/tracks`);
                return result;
            } catch (error) {
                console.log(`Account ${account.account_name} cannot access playlist ${playlistId} tracks:`, error);
                continue;
            }
        }
        throw new Error(`No account has access to playlist ${playlistId} tracks`);
    }
    return await spotifyFetch(accountId, `/playlists/${playlistId}/tracks`);
}

export async function addTrackToPlaylist(playlistId: string, trackUris: string | string[], accountId?: string) {
    // If no accountId provided, try to find which account has access to this playlist
    if (!accountId) {
        const accounts = await getConnectedAccounts();
        
        // Try each account until we find one that can access this playlist
        for (const account of accounts) {
            try {
                const uris = Array.isArray(trackUris) ? trackUris : [trackUris];
                const result = await spotifyFetch(account.id, `/playlists/${playlistId}/tracks`, {
                    method: 'POST',
                    body: JSON.stringify({ uris })
                });
                return result;
            } catch (error) {
                console.log(`Account ${account.account_name} cannot add tracks to playlist ${playlistId}:`, error);
                continue;
            }
        }
        throw new Error(`No account has access to add tracks to playlist ${playlistId}`);
    }
    
    const uris = Array.isArray(trackUris) ? trackUris : [trackUris];
    return await spotifyFetch(accountId, `/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ uris })
    });
}

export async function searchTracks(query: string, accountId?: string) {
    // If no accountId provided, use the first available account
    if (!accountId) {
        const accounts = await getConnectedAccounts();
        if (accounts.length === 0) {
            throw new Error('No connected accounts found');
        }
        accountId = accounts[0].id;
    }
    return await spotifyFetch(accountId, `/search?type=track&q=${encodeURIComponent(query)}&limit=20`);
}

export async function removeTrackFromPlaylist(playlistId: string, trackUri: string, position?: number, accountId?: string) {
    // If no accountId provided, try to find which account has access to this playlist
    if (!accountId) {
        const accounts = await getConnectedAccounts();
        
        // Try each account until we find one that can access this playlist
        for (const account of accounts) {
            try {
                const body: any = {
                    tracks: [{ uri: trackUri }]
                };
                
                if (position !== undefined) {
                    body.tracks[0].positions = [position];
                }
                
                const result = await spotifyFetch(account.id, `/playlists/${playlistId}/tracks`, {
                    method: 'DELETE',
                    body: JSON.stringify(body)
                });
                return result;
            } catch (error) {
                console.log(`Account ${account.account_name} cannot remove tracks from playlist ${playlistId}:`, error);
                continue;
            }
        }
        throw new Error(`No account has access to remove tracks from playlist ${playlistId}`);
    }
    
    const body: any = {
        tracks: [{ uri: trackUri }]
    };
    
    if (position !== undefined) {
        body.tracks[0].positions = [position];
    }
    
    return await spotifyFetch(accountId, `/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        body: JSON.stringify(body)
    });
}