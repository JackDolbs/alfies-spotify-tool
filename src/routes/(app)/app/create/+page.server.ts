import { error, redirect, type Response } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createPlaylist } from '$lib/spotify/server';

export const load: PageServerLoad = async () => {
    return {};
};

export const actions = {
    create: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name')?.toString();
        const description = data.get('description')?.toString();

        if (!name) {
            return {
                success: false,
                error: 'Playlist name is required'
            };
        }

        const playlist = await createPlaylist(name, description);
        console.log('Created playlist:', playlist);
        
        if (!playlist?.id) {
            throw error(500, 'Failed to get playlist ID from Spotify');
        }
        
        // Redirect to the new playlist
        throw redirect(303, `/app/playlist/${playlist.id}`);
    }
} satisfies Actions;