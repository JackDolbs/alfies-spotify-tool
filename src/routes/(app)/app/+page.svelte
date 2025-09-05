<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import SearchIcon from "@lucide/svelte/icons/search";
    import { goto } from "$app/navigation";
    import type { PageData } from './$types';

    export let data: PageData;
    
    
    // Search functionality
    let searchQuery = '';
    
    // Filter playlists based on search query
    $: filteredPlaylists = data.playlists.filter(playlist => 
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
</script>

<div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Your Playlists</h1>
        <Button href="/app/create">Create New Playlist</Button>
    </div>

    <!-- Search Bar -->
    <div class="mb-6">
        <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <SearchIcon class="h-4 w-4 text-muted-foreground" />
            </div>
            <Input 
                type="search"
                placeholder="Search playlists by name..."
                bind:value={searchQuery}
                class="w-full pl-10"
            />
        </div>
        {#if searchQuery}
            <div class="mt-2">
                <span class="text-sm text-muted-foreground">
                    {filteredPlaylists.length} playlist{filteredPlaylists.length === 1 ? '' : 's'} found
                </span>
            </div>
        {/if}
    </div>

    <!-- Playlists Table -->
    <div class="overflow-x-auto">
        <table class="w-full border-collapse">
            <thead>
                <tr class="border-b">
                    <th class="text-left p-4">Name</th>
                    <th class="text-left p-4">Tracks</th>
                    <th class="text-left p-4">Saves</th>
                    <th class="text-left p-4">Creator</th>
                </tr>
            </thead>
            <tbody>
                {#each filteredPlaylists as playlist}
                    <tr 
                        class="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        on:click={() => goto(`/app/playlist/${playlist.id}`)}
                    >
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
                        <td class="p-4">{playlist.saves.toLocaleString()} saves</td>
                        <td class="p-4">{playlist.owner}</td>
                    </tr>
                {:else}
                    <tr>
                        <td colspan="4" class="p-8 text-center text-muted-foreground">
                            {#if searchQuery}
                                No playlists found matching "{searchQuery}"
                            {:else}
                                No playlists found
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>