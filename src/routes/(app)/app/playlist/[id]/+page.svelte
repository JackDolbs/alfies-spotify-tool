<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import type { PageData } from './$types';

    export let data: PageData;
    
    function formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
</script>

<div class="container mx-auto py-8 space-y-6">
    <div class="flex items-start gap-6">
        {#if data.playlist.imageUrl}
            <img 
                src={data.playlist.imageUrl} 
                alt={data.playlist.name}
                class="w-48 h-48 object-cover rounded-lg shadow-lg"
            />
        {:else}
            <div class="w-48 h-48 bg-muted rounded-lg shadow-lg flex items-center justify-center text-4xl">
                🎵
            </div>
        {/if}
        
        <div class="flex-1">
            <h1 class="text-4xl font-bold mb-2">{data.playlist.name}</h1>
            {#if data.playlist.description}
                <p class="text-muted-foreground mb-4">{data.playlist.description}</p>
            {/if}
            <div class="flex gap-4 text-sm text-muted-foreground">
                <span>{data.playlist.tracks.length} tracks</span>
                <span>•</span>
                <span>{data.playlist.followers} followers</span>
                <span>•</span>
                <span>{data.playlist.public ? 'Public' : 'Private'}</span>
            </div>
        </div>
    </div>

    <div class="space-y-4">
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-semibold">Tracks</h2>
            <Button variant="outline" href="/app/create">Add Tracks</Button>
        </div>

        <div class="border rounded-lg overflow-hidden">
            <table class="w-full">
                <thead>
                    <tr class="border-b bg-muted/50">
                        <th class="p-4 text-left">#</th>
                        <th class="p-4 text-left">Title</th>
                        <th class="p-4 text-left">Artist</th>
                        <th class="p-4 text-left">Album</th>
                        <th class="p-4 text-left">Duration</th>
                        <th class="p-4 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.playlist.tracks as track, i}
                        <tr class="border-b hover:bg-muted/50">
                            <td class="p-4">{i + 1}</td>
                            <td class="p-4">{track.name}</td>
                            <td class="p-4">{track.artists}</td>
                            <td class="p-4">{track.album}</td>
                            <td class="p-4">{formatDuration(track.duration)}</td>
                            <td class="p-4">
                                <div class="flex gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        title="Change position"
                                    >
                                        #
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        title="Remove from playlist"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>
