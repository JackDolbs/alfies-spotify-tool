<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import {
        Table,
        TableBody,
        TableCell,
        TableHead,
        TableHeader,
        TableRow,
    } from "$lib/components/ui/table";
    import SearchIcon from "@lucide/svelte/icons/search";
    import { goto } from "$app/navigation";
    import type { PageData } from './$types';

    export let data: PageData;
    
    
    // Search functionality
    let searchQuery = '';

    interface Playlist {
        id: string;
        name: string;
        trackCount: number;
        saves: number;
        owner: string;
        imageUrl: string | null;
    }
    
    // Filter playlists based on search query
    $: filteredPlaylists = data.playlists.filter((playlist: Playlist) => 
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
    <div class="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead class="w-[50%]">Name</TableHead>
                    <TableHead class="text-right">Tracks</TableHead>
                    <TableHead class="text-right">Saves</TableHead>
                    <TableHead class="text-right">Creator</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {#each filteredPlaylists as playlist}
                    <TableRow class="hover:bg-muted/50">
                        <td colspan="4" class="p-0">
                            <button 
                                type="button"
                                class="w-full text-left cursor-pointer"
                                on:click|preventDefault={() => goto(`/app/playlist/${playlist.id}`)}
                            >
                                <div class="grid grid-cols-[50%_1fr_1fr_1fr] items-center">
                                    <div class="p-4">
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
                                            <span class="font-medium">{playlist.name}</span>
                                        </div>
                                    </div>
                                    <div class="p-4 text-right">
                                        {playlist.trackCount} tracks
                                    </div>
                                    <div class="p-4 text-right">
                                        {playlist.saves.toLocaleString()} saves
                                    </div>
                                    <div class="p-4 text-right">
                                        {playlist.owner}
                                    </div>
                                </div>
                            </button>
                        </td>
                    </TableRow>
                {:else}
                    <TableRow>
                        <TableCell class="h-24 text-center" {...{ colspan: 4 }}>
                            <div class="text-sm text-muted-foreground">
                                {#if searchQuery}
                                    No playlists found matching "{searchQuery}"
                                {:else}
                                    No playlists found
                                {/if}
                            </div>
                        </TableCell>
                    </TableRow>
                {/each}
            </TableBody>
        </Table>
    </div>
</div>