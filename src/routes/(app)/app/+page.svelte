<script lang="ts">
    import { Button } from "$lib/components/ui/button";
</script>

<div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-4">Connected to Spotify!</h1>
    <p class="mb-4">Your Spotify account has been successfully connected.</p>
    
    <div class="space-y-4">
        <Button href="/app/playlist" variant="default">
            Go to Playlist Manager
        </Button>
    </div>
</div>