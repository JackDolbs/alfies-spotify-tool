<script lang="ts">
    import { Button } from "$lib/components/ui/button";
</script>

<div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-md space-y-8 p-8">
        <div class="text-center">
            <h1 class="text-4xl font-bold">Spotify Playlist Manager</h1>
            <p class="mt-2 text-gray-600">Connect your Spotify account to get started</p>
        </div>

        <div class="mt-8 space-y-4">
            <Button 
                href="/auth/api/spotify/login"
                class="w-full"
                size="lg"
            >
                Connect with Spotify
            </Button>
        </div>
    </div>
</div>
