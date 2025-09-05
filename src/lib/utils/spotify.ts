import SpotifyWebApi from 'spotify-web-api-js';

let spotifyApi: SpotifyWebApi.SpotifyWebApiJs | null = null;

export async function getSpotifyApi() {
    if (!spotifyApi) {
        spotifyApi = new SpotifyWebApi();
    }

    try {
        // Try to use the API
        await spotifyApi.getMe();
    } catch (error) {
        // If unauthorized, try to refresh the token
        if (error.status === 401) {
            const response = await fetch('/auth/api/spotify/refresh', {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const { access_token } = await response.json();
            spotifyApi.setAccessToken(access_token);
        } else {
            throw error;
        }
    }

    return spotifyApi;
}
