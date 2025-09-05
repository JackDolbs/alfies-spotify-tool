export interface SpotifyArtist {
    id: string;
    name: string;
    uri: string;
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    uri: string;
    images: Array<{
        url: string;
        height: number;
        width: number;
    }>;
}

export interface SpotifyTrack {
    id: string;
    name: string;
    uri: string;
    duration_ms: number;
    artists: SpotifyArtist[];
    album: SpotifyAlbum;
}

export interface SpotifyPlaylist {
    id: string;
    name: string;
    description: string;
    followers: {
        total: number;
    };
    images: Array<{
        url: string;
        height: number;
        width: number;
    }>;
}
