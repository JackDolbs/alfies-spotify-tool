<script lang="ts">
    import { Button } from "$lib/components/ui/button";
</script>

<div class="min-h-screen bg-background">
    <header class="border-b">
        <div class="container mx-auto p-4 flex justify-between items-center">
            <h1 class="text-xl font-semibold">Spotify Playlist Manager</h1>
            <Button variant="ghost" href="/auth">Logout</Button>
        </div>
    </header>

    <main>
        <slot />
    </main>
</div>
