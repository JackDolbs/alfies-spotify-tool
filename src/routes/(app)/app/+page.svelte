<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import type { PageData } from './$types';

    export let data: PageData;
</script>

<div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Your Playlists</h1>
        <Button href="/app/create">Create New Playlist</Button>
    </div>

    <!-- Basic table for now, we can style it better later -->
    <div class="overflow-x-auto">
        <table class="w-full border-collapse">
            <thead>
                <tr class="border-b">
                    <th class="text-left p-4">Name</th>
                    <th class="text-left p-4">Tracks</th>
                    <th class="text-left p-4">Followers</th>
                    <th class="text-left p-4">Actions</th>
                </tr>
            </thead>
            <tbody>
                {#each data.playlists as playlist}
                    <tr class="border-b hover:bg-muted/50">
                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                {#if playlist.imageUrl}
                                    <img 
                                        src={playlist.imageUrl} 
                                        alt={playlist.name}
                                        class="w-10 h-10 object-cover rounded"
                                    />
                                {:else}
                                    <div class="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                        🎵
                                    </div>
                                {/if}
                                {playlist.name}
                            </div>
                        </td>
                        <td class="p-4">{playlist.trackCount} tracks</td>
                        <td class="p-4">{playlist.followers} followers</td>
                        <td class="p-4">
                            <Button variant="outline" size="sm" href="/app/playlist/{playlist.id}">
                                View
                            </Button>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>