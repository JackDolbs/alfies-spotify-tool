<!-- src/routes/(app)/app/+page.svelte -->
<script lang="ts">
    import LockIcon from "@lucide/svelte/icons/lock";
    import UnlockIcon from "@lucide/svelte/icons/unlock";
    import SearchIcon from "@lucide/svelte/icons/search";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import CheckIcon from "@lucide/svelte/icons/check";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import type { PageData } from './$types';

    export let data: PageData;
    
    // Debug logging
    console.log('🔍 App page data:', data);
    console.log('🔍 Playlists count:', data?.playlists?.length || 0);
    
    // Search functionality
    let searchQuery = '';

    // Sort functionality
    type SortOption = 'access' | 'creator' | 'newest' | 'account';
    type SortDirection = 'asc' | 'desc';
    
    let sortBy: SortOption = 'newest';
    let sortDirection: SortDirection = 'desc';
    let showSortDropdown = false;
    let filteredAndSortedPlaylists: any[] = [];

    const sortOptions: { value: SortOption; label: string }[] = [
        { value: 'account', label: 'Account' },
        { value: 'access', label: 'Access' },
        { value: 'creator', label: 'Creator' },
        { value: 'newest', label: 'Newest' }
    ];

    function sortPlaylists(playlists: any[]): any[] {
        console.log(`🔄 Sorting ${playlists.length} playlists by ${sortBy} (${sortDirection})`);
        
        const sorted = [...playlists].sort((a, b) => {
            let result = 0;

            switch (sortBy) {
                case 'account':
                    result = a.accountName.toLowerCase().localeCompare(b.accountName.toLowerCase());
                    break;
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
                    const aIndex = (data?.playlists || []).findIndex((p: any) => p.id === a.id);
                    const bIndex = (data?.playlists || []).findIndex((p: any) => p.id === b.id);
                    result = aIndex - bIndex;
                    break;
                default:
                    console.log('⚠️ Unknown sort option:', sortBy);
                    return 0;
            }

            const finalResult = sortDirection === 'asc' ? result : -result;
            return finalResult;
        });
        
        return sorted;
    }

    function getAccessLevel(playlist: any): string {
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
        updateFilteredPlaylists();
    }

    function handleRowClick(playlistId: string) {
        console.log('🎯 Row clicked, navigating to playlist:', playlistId);
        goto(`/app/playlist/${playlistId}`);
    }

    function updateFilteredPlaylists() {
        console.log('🔍 Updating filtered playlists:', { 
            dataPlaylists: data?.playlists?.length, 
            searchQuery, 
            sortBy, 
            sortDirection 
        });
        
        const playlists = data?.playlists || [];
        const filtered = playlists.filter((playlist: any) => 
            !searchQuery || 
            playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            playlist.accountName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        filteredAndSortedPlaylists = sortPlaylists(filtered);
        console.log('🔍 Filtered and sorted:', filteredAndSortedPlaylists.length);
    }

    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
        const target = event.target as Element;
        const sortDropdown = document.querySelector('[data-sort-dropdown]');
        const sortButton = document.querySelector('[data-sort-button]');
        
        // Only handle this if the dropdown is actually open
        if (!showSortDropdown) return;
        
        if (sortDropdown && sortButton) {
            if (!sortDropdown.contains(target) && !sortButton.contains(target)) {
                showSortDropdown = false;
            }
        }
    }

    onMount(() => {
        document.addEventListener('click', handleClickOutside);
        console.log('🔍 Component mounted with data:', data);
        updateFilteredPlaylists();
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });
    
    // Watch for changes and update
    $: if (data?.playlists || searchQuery !== undefined) {
        updateFilteredPlaylists();
    }
</script>

<div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Your Playlists</h1>
        <div class="flex gap-2">
            <a 
                href="/app/bulk-add"
                class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground border border-input shadow hover:bg-secondary/90 h-9 px-4 py-2"
            >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Bulk Add Songs
            </a>
            <a 
                href="/app/create"
                class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
                Create New Playlist
            </a>
        </div>
    </div>

    <!-- Search and Sort Bar -->
    <div class="mb-6">
        <div class="flex gap-3">
            <!-- Search Input -->
            <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                    <SearchIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                <input 
                    type="search"
                    placeholder="Search playlists by name or account..."
                    bind:value={searchQuery}
                    class="relative border-input bg-background selection:bg-primary dark:bg-input/30 selection:text-primary-foreground ring-offset-background placeholder:text-muted-foreground shadow-xs flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pl-10"
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
        <div class="relative w-full overflow-x-auto">
            <table class="w-full caption-bottom text-sm">
                <thead class="[&_tr]:border-b">
                    <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Name</th>
                        <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Account</th>
                        <th class="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Tracks</th>
                        <th class="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Saves</th>
                        <th class="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Creator</th>
                        <th class="h-12 px-4 text-center align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Access</th>
                    </tr>
                </thead>
                <tbody class="[&_tr:last-child]:border-0">
                    {#each filteredAndSortedPlaylists as playlist (`${playlist.id}-${playlist.accountId}`)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                        <tr 
                            class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                            data-playlist-row
                            data-playlist-id={playlist.id}
                            on:click={() => handleRowClick(playlist.id)}
                        >
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0 w-[40%]">
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
                                    <a 
                                        href="/app/playlist/{playlist.id}"
                                        class="font-medium hover:underline text-foreground"
                                        on:click={(e) => {
                                            e.preventDefault();
                                            handleRowClick(playlist.id);
                                        }}
                                    >
                                        {playlist.name}
                                    </a>
                                </div>
                            </td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0 w-[20%]">
                                <span class="text-sm text-muted-foreground">{playlist.accountName}</span>
                            </td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right">
                                {playlist.trackCount} tracks
                            </td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right">
                                {playlist.saves.toLocaleString()} saves
                            </td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right">
                                {playlist.owner}
                            </td>
                            <td class="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-center">
                                {#if playlist.canEdit}
                                    <UnlockIcon class="h-4 w-4 text-green-500 mx-auto" />
                                {:else}
                                    <LockIcon class="h-4 w-4 text-orange-500 mx-auto" />
                                {/if}
                            </td>
                        </tr>
                    {:else}
                        <tr>
                            <td class="h-24 p-4 align-middle [&:has([role=checkbox])]:pr-0 text-center" colspan="6">
                                <div class="text-sm text-muted-foreground">
                                    {#if searchQuery}
                                        No playlists found matching "{searchQuery}"
                                    {:else}
                                        No playlists found
                                    {/if}
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>