export interface SpotifyAccount {
    id: string;
    account_name: string;
    spotify_access_token: string;
    spotify_refresh_token: string;
    playlist_ids: string[];
    created: string;
    updated: string;
}
