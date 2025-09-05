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
    import LockIcon from "@lucide/svelte/icons/lock";
    import UnlockIcon from "@lucide/svelte/icons/unlock";
    import SearchIcon from "@lucide/svelte/icons/search";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import CheckIcon from "@lucide/svelte/icons/check";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import type { PageData } from './$types';

    export let data: PageData;
    
    
    // Search functionality
    let searchQuery = '';

    // Sort functionality
    type SortOption = 'access' | 'creator' | 'newest' | 'recently_updated';
    type SortDirection = 'asc' | 'desc';
    
    let sortBy: SortOption = 'newest';
    let sortDirection: SortDirection = 'desc';
    let showSortDropdown = false;
    let filteredAndSortedPlaylists: Playlist[] = [];

    interface Playlist {
        id: string;
        name: string;
        trackCount: number;
        saves: number;
        owner: string;
        imageUrl: string | null;
        canEdit?: boolean;
        public?: boolean;
        collaborative?: boolean;
        snapshotId?: string;
    }

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: 'access', label: 'Access' },
        { value: 'creator', label: 'Creator' },
        { value: 'newest', label: 'Newest' },
        { value: 'recently_updated', label: 'Recently Updated' }
    ];

    function sortPlaylists(playlists: Playlist[]): Playlist[] {
        console.log(`🔄 Sorting ${playlists.length} playlists by ${sortBy} (${sortDirection})`);
        
        const sorted = [...playlists].sort((a, b) => {
            let result = 0;

            switch (sortBy) {
                case 'access':
                    // Sort by access level: editable playlists first, then public/private
                    const aAccess = getAccessLevel(a);
                    const bAccess = getAccessLevel(b);
                    result = aAccess.localeCompare(bAccess);
                    break;
                case 'creator':
                    result = a.owner.toLowerCase().localeCompare(b.owner.toLowerCase());
                    break;
                case 'newest':
                    // Use the original order from Spotify as proxy for creation order (newest first in desc)
                    const aIndex = data.playlists.findIndex((p: Playlist) => p.id === a.id);
                    const bIndex = data.playlists.findIndex((p: Playlist) => p.id === b.id);
                    result = aIndex - bIndex;
                    break;
                case 'recently_updated':
                    // Use snapshot_id as proxy for recent updates (lexicographical sort)
                    const aSnapshot = a.snapshotId || '';
                    const bSnapshot = b.snapshotId || '';
                    result = aSnapshot.localeCompare(bSnapshot);
                    break;
                default:
                    console.log('⚠️ Unknown sort option:', sortBy);
                    return 0;
            }

            const finalResult = sortDirection === 'asc' ? result : -result;
            return finalResult;
        });
        
        console.log('✅ Sorted result:', sorted.slice(0, 3).map(p => `${p.name} (${p.owner})`));
        return sorted;
    }

    function getAccessLevel(playlist: Playlist): string {
        if (playlist.canEdit) return '1-editable';
        if (playlist.collaborative) return '2-collaborative';
        if (playlist.public) return '3-public';
        return '4-private';
    }

    function handleSortChange(option: SortOption) {
        if (sortBy === option) {
            // Toggle direction if same option selected
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New option selected, default to ascending
            sortBy = option;
            sortDirection = 'asc';
        }
        showSortDropdown = false;
    }

    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
        const target = event.target as Element;
        const sortDropdown = document.querySelector('[data-sort-dropdown]');
        const sortButton = document.querySelector('[data-sort-button]');
        
        if (showSortDropdown && sortDropdown && sortButton) {
            if (!sortDropdown.contains(target) && !sortButton.contains(target)) {
                showSortDropdown = false;
            }
        }
    }

    onMount(() => {
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });
    
    // Filter and sort playlists - reactive to search, sort, and data changes
    $: {
        console.log('🔥 Reactive statement triggered!', { sortBy, sortDirection, searchQuery });
        const filtered = data.playlists.filter((playlist: Playlist) => 
            playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        filteredAndSortedPlaylists = sortPlaylists(filtered);
        console.log('🔥 Updated filteredAndSortedPlaylists:', filteredAndSortedPlaylists.map((p: Playlist) => p.name));
    }
</script>

<div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Your Playlists</h1>
        <Button href="/app/create">Create New Playlist</Button>
    </div>

    <!-- Search and Sort Bar -->
    <div class="mb-6">
        <div class="flex gap-3">
            <!-- Search Input -->
            <div class="relative flex-1">
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
            
            <!-- Sort Dropdown -->
            <div class="relative">
                <button
                    type="button" 
                    class="inline-flex items-center justify-between min-w-[140px] px-4 py-2 text-sm font-medium bg-background border border-input rounded-md shadow-xs hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    data-sort-button
                    on:click={() => showSortDropdown = !showSortDropdown}
                >
                    Sort by {sortOptions.find(opt => opt.value === sortBy)?.label}
                    <ChevronDownIcon class="ml-2 h-4 w-4" />
                </button>
                
                {#if showSortDropdown}
                    <div class="absolute right-0 mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-10" data-sort-dropdown>
                        <div class="py-1">
                            {#each sortOptions as option}
                                <button
                                    type="button"
                                    class="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                                    on:click={() => handleSortChange(option.value)}
                                >
                                    <span>{option.label}</span>
                                    {#if sortBy === option.value}
                                        <div class="flex items-center gap-1">
                                            <CheckIcon class="h-4 w-4" />
                                            <span class="text-xs text-muted-foreground">
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        </div>
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
        
        <div class="mt-2 flex gap-4">
            {#if searchQuery}
                <span class="text-sm text-muted-foreground">
                    {filteredAndSortedPlaylists.length} playlist{filteredAndSortedPlaylists.length === 1 ? '' : 's'} found
                </span>
            {/if}
            <span class="text-sm text-muted-foreground">
                Sorted by: {sortOptions.find(opt => opt.value === sortBy)?.label} ({sortDirection === 'asc' ? '↑' : '↓'})
            </span>
        </div>
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
                                <TableHead class="w-[48px] text-center">Access</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {#each filteredAndSortedPlaylists as playlist (playlist.id)}
                    <TableRow class="hover:bg-muted/50">
                        <td colspan="5" class="p-0">
                            <button 
                                type="button"
                                class="w-full text-left cursor-pointer"
                                on:click|preventDefault={() => goto(`/app/playlist/${playlist.id}`)}
                            >
                                                                           <div class="grid grid-cols-[50%_1fr_1fr_1fr_48px] items-center gap-4">
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
                                           <div class="p-4 flex items-center justify-center">
                                               {#if playlist.canEdit}
                                                   <UnlockIcon class="h-4 w-4 text-green-500" />
                                               {:else}
                                                   <LockIcon class="h-4 w-4 text-orange-500" />
                                               {/if}
                                           </div>
                                </div>
                            </button>
                        </td>
                    </TableRow>
                {:else}
                    <TableRow>
                        <TableCell class="h-24 text-center" {...{ colspan: 5 }}>
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