import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PocketBase from 'pocketbase';

export const POST: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        throw error(401, 'Not authenticated');
    }

    const pb = new PocketBase(process.env.POCKETBASE_URL);
    
    // Get the current tokens
    const records = await pb.collection(process.env.POCKETBASE_COLLECTION).getFullList({
        filter: `user = "${locals.user.id}"`
    });

    if (!records.length) {
        throw error(404, 'No Spotify tokens found');
    }

    const record = records[0];
    
    // Request new access token using refresh token
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: record.spotify_refresh_token,
            client_id: process.env.SPOTIFY_CLIENT_ID
        })
    });

    if (!response.ok) {
        throw error(response.status, 'Failed to refresh token');
    }

    const { access_token, refresh_token } = await response.json();

    // Update tokens in PocketBase
    await pb.collection(process.env.POCKETBASE_COLLECTION).update(record.id, {
        spotify_access_token: access_token,
        ...(refresh_token && { spotify_refresh_token: refresh_token })
    });

    return json({ access_token });
};
