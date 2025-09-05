# Authentication Flow Documentation

## Overview
The application uses a combination of PocketBase and Spotify OAuth for authentication. Since this is a single-user app, we use PocketBase admin authentication to manage Spotify tokens securely.

## Components

### 1. Route Structure
```
/
├── (auth)
│   └── auth/           # Authentication pages
│       └── api/spotify/
│           ├── login     # Initiates Spotify OAuth
│           ├── callback  # Handles OAuth response
│           └── refresh   # Handles token refresh
└── (app)
    └── app/            # Protected application routes
```

### 2. PocketBase Setup
- Collection: `alfies_spotify_tool`
- Fields:
  - `spotify_access_token` (text)
  - `spotify_refresh_token` (text)
  - `playlist_id` (text)
- Single record to store tokens (record ID in env vars)

### 3. Environment Variables
```env
VITE_POCKETBASE_URL=https://db.auriel.tech
VITE_POCKETBASE_COLLECTION=alfies_spotify_tool
VITE_POCKETBASE_ADMIN_EMAIL=your_admin_email
VITE_POCKETBASE_ADMIN_PASSWORD=your_admin_password
VITE_POCKETBASE_RECORD_ID=your_record_id
VITE_SPOTIFY_CLIENT_ID=your_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_client_secret
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/auth/api/spotify/callback
```

## Authentication Flow

1. **Initial Route Check** (`/src/routes/+page.server.ts`)
   - Checks for existing Spotify tokens
   - Redirects to `/app` if tokens exist
   - Redirects to `/auth` if no tokens

2. **Spotify OAuth** (`/src/routes/(auth)/auth/api/spotify/login/+server.ts`)
   - Implements PKCE (Proof Key for Code Exchange)
   - Generates code verifier and challenge
   - Redirects to Spotify authorization URL

3. **OAuth Callback** (`/src/routes/(auth)/auth/api/spotify/callback/+server.ts`)
   - Receives authorization code from Spotify
   - Exchanges code for access and refresh tokens
   - Stores tokens in PocketBase using admin auth
   - Redirects to `/app` on success

4. **Route Protection** (`/src/routes/+layout.server.ts`)
   - Runs on every request
   - Checks token existence in PocketBase
   - Enforces route access:
     - `/app/*`: Requires valid tokens
     - `/auth`: Redirects to `/app` if tokens exist

## Token Storage

1. **PocketBase Record**
   - Single record stores both tokens
   - Admin authentication required for read/write
   - No user authentication needed (single-user app)

2. **Token Validation**
   ```typescript
   const hasSpotifyTokens = 
       typeof record.spotify_access_token === 'string' && 
       record.spotify_access_token.length > 0 &&
       typeof record.spotify_refresh_token === 'string' && 
       record.spotify_refresh_token.length > 0;
   ```

## Error Handling
- Failed PocketBase operations redirect to `/auth`
- Invalid/expired tokens trigger refresh flow
- OAuth errors show appropriate error messages

## Security Notes
1. All PocketBase operations use admin authentication
2. Spotify tokens stored server-side only
3. PKCE used for OAuth security
4. Environment variables for all sensitive data

## Debugging
Key debug logs to watch for:
```typescript
Auth Check: { 
    path: '/current/path', 
    hasTokens: true/false 
}
```
- `hasTokens`: Boolean indicating valid token presence
- Redirect messages show flow direction
- PocketBase errors indicate auth/storage issues
