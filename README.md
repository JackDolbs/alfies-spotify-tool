# Alfie's Spotify Playlist Manager

A lightweight SvelteKit application for managing a Spotify playlist. This microservice allows for playlist track management, including adding songs via search and reordering tracks through position inputs.

## Prerequisites

- Node.js (v18 or higher)
- npm/pnpm/yarn
- Spotify Developer Account
- Access to the PocketBase instance for admin

## Environment Variables

Create a `.env` file in the root directory with:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
POCKETBASE_URL=your_pocketbase_url
PLAYLIST_ID=your_spotify_playlist_id
```

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/spotify-playlist-manager.git
cd spotify-playlist-manager
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
# or
yarn
```

3. Set up Spotify App:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new application
   - Add `http://localhost:5173/callback` to Redirect URIs
   - Copy Client ID and Client Secret to your `.env` file

4. Start the development server:
```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

The app will be available at `http://localhost:5173`

## First-Time Setup

After deployment, you must:

1. Create a superuser account via the signup/auth flow
2. Connect your Spotify account
3. Set the target playlist ID in your environment variables

## Building for Production

```bash
npm run build
# or
pnpm build
# or
yarn build
```

Preview the production build:
```bash
npm run preview
```

## Tech Stack

- SvelteKit (TypeScript)
- TailwindCSS
- Shadcn UI Components
- PocketBase (via API)
- Spotify Web API
