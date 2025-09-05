# Spotify Playlist Manager

## Project Overview
The Spotify Playlist Manager is a lightweight web application built with SvelteKit, TailwindCSS, Shadcn, PocketBase, and the Spotify Web API. It allows a single user to add songs to a Spotify playlist, reorder tracks, and view the playlist's follower count. The app prioritizes simplicity and functionality over extensive polish, targeting a minimal viable product (MVP) for rapid development. This is designed to be deployed as a microservice as part of a wider product suite.

## Objectives
- Enable a user to authenticate with Spotify and manage a specific playlist
- Provide functionality to add songs to a playlist via search
- Allow reordering of playlist tracks via position input
- Display the total number of playlist followers
- Keep the app fast and lightweight with minimal dependencies and a simple UI

## Tech Stack
- **Frontend**: SvelteKit (TypeScript) for routing, server-side logic, and UI components
- **Styling**: TailwindCSS for rapid, utility-first styling; Shadcn for pre-built UI components (e.g., Button, Input, Card)
- **Backend**: PocketBase for user authentication and storing Spotify access/refresh tokens (via API)
- **API**: Spotify Web API for playlist operations (add tracks, reorder, fetch followers)

## Functional Requirements

### 1. Authentication
**Feature**: Spotify and Google OAuth 2.0 Authorization Code Flow with PKCE for secure authentication

**Details**:
- User clicks a "Connect Spotify" or "Connect Google" buttons, redirecting to Spotify's or Googles auth URL
- Required scopes: playlist-modify-private, playlist-read-private (optional: playlist-modify-public for public playlists)
- After auth, store access and refresh tokens in PocketBase for the user
- Implement token refresh to maintain access without re-authentication

**Implementation**:
- Endpoint: https://accounts.spotify.com/authorize and https://accounts.spotify.com/api/token
- Storage: PocketBase users collection (fields: email, spotify_access_token, spotify_refresh_token)

### 2. Add Songs to Playlist
**Feature**: Search for songs (globally across Spotify) and add them to a specified playlist

**Details**:
- Input field (Shadcn Input) for song search query
- Search via Spotify API: `GET https://api.spotify.com/v1/search?q={query}&type=track`
- Display search's top results (e.g., 5 tracks) in a list with an "Add" button (Shadcn Button)
- Add track to playlist: `POST https://api.spotify.com/v1/playlists/{playlist_id}/tracks` with body `{ uris: ["spotify:track:TRACK_ID"] }`
- Hardcode playlist ID for simplicity (configurable via UI or env in future iterations)

### 3. Reorder Playlist Tracks
**Feature**: Reorder tracks in the playlist using position input

**Details**:
- Display playlist tracks in a numbered list with current position
- Each track has an input field for new position (Shadcn Input, type="number")
- When user enters a new position number:
  - Validate input is within playlist bounds (1 to playlist length)
  - Move track to specified position
  - Automatically shift other tracks down to accommodate the move
  - Update track order: `PUT https://api.spotify.com/v1/playlists/{playlist_id}/tracks` with body `{ range_start: oldIndex, insert_before: newIndex }`
- Fetch initial track list: `GET https://api.spotify.com/v1/playlists/{playlist_id}/tracks`

### 4. Fetch Playlist Followers
**Feature**: Display the total number of playlist followers

**Details**:
- Fetch follower count: `GET https://api.spotify.com/v1/playlists/{playlist_id}?fields=followers.total`
- Display in a simple UI element (e.g., Shadcn Card or plain text: "Followers: {number}")
- Update on page load or after playlist modifications

## Non-Functional Requirements

### Performance
- App should load and respond within 2 seconds for API calls (assuming Spotify API and PocketBase are responsive)

### Security
- Use PKCE for Spotify OAuth to avoid exposing client secrets
- Store tokens securely in PocketBase, not in browser storage
- Avoid hardcoding sensitive data (Client ID/Secret in .env)

### Other Requirements
- **Simplicity**: Minimal UI with TailwindCSS and Shadcn; no advanced animations or responsive design beyond basic functionality
- **Single-User Focus**: Hardcode a single user's Spotify account and playlist ID to reduce complexity

## Dependencies
- **sveltekit**: Framework for frontend and server routes
- **tailwindcss**, **postcss**, **autoprefixer**: Styling
- **pocketbase**: JS SDK for backend operations
- Optional: **spotify-web-api-js** for simplified Spotify API calls

## API Endpoints (Spotify)

### Auth
- `GET /authorize`: Redirect for user login
- `POST /api/token`: Exchange code for tokens

### Playlist Operations
- `GET /playlists/{id}/tracks`: Fetch tracks
- `POST /playlists/{id}/tracks`: Add tracks
- `PUT /playlists/{id}/tracks`: Reorder tracks
- `GET /playlists/{id}?fields=followers.total`: Fetch follower count

### Search
- `GET /search?q={query}&type=track`: Search for tracks

## Assumptions and Simplifications
- **Initial Setup**: First action post-deployment must be setting up the superuser account via signup/auth
- **PocketBase Integration**: Communication with existing PocketBase instance will be via API, requiring only new collection creation
- **Single User**: App is built for one Spotify account (developer's own) to avoid multi-user complexity
- **Hardcoded Playlist**: Use a single playlist ID (configurable later if needed)
- **Minimal UI**: Basic Tailwind styles and Shadcn components; no advanced responsiveness or animations
- **No Error States**: Minimal error handling (e.g., show console logs or basic alerts)

## Development Plan

### Setup
1. Create required PocketBase collections via API
2. Register Spotify app, configure Client ID/Secret
3. Set up superuser account post-deployment

### Spotify Auth
1. Implement login and callback routes with PKCE
2. Store tokens in PocketBase
3. Test auth flow

### Core Features
1. Build playlist page with track list (fetch tracks, display in Cards)
2. Add song search and POST functionality
3. Implement position-based reordering with number input
4. Display follower count

### Testing
1. Verify auth, song addition, reordering, and follower display
2. Debug API errors (e.g., 401, 429)

## Potential Risks
- **OAuth Complexity**: Misconfigured PKCE or scopes could delay auth setup
- **API Limits**: Spotify rate limits may cause 429 errors. Mitigation: Test with single-user, low-frequency calls
- **Position Input Edge Cases**: Need careful handling of invalid inputs and boundary conditions
- **PocketBase API Integration**: Ensure proper error handling for API communication

## Deliverables
1. Working SvelteKit app with:
   - Spotify login/logout
   - Playlist page to view tracks, add songs, reorder tracks, and show followers
   - Basic Tailwind-styled UI with Shadcn components
2. PocketBase collection schemas and API integration
3. Documentation (this spec)