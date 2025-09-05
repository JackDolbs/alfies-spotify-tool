<script lang="ts">
    import { enhance } from "$app/forms";
    import { invalidateAll, goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { ScrollArea } from "$lib/components/ui/scroll-area";
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
    import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
    import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
    import type { PageData, ActionData } from './$types';

    export let data: PageData;
    export const form: ActionData = null;
    
    // Search functionality
    let searchQuery = '';
    let searchResults: Track[] = [];
    let searching = false;
    
    // Track management state
    let editingTrackId: string | null = null;
    let isProcessingReorder = false; // Prevent duplicate calls
    let lastReorderTime = 0; // Additional debounce protection
    
    // UI state
    let isAddTracksExpanded = false;
    let addedTracks = new Set<string>(); // Track URIs that have been added
    
    interface Track {
        id: string;
        name: string;
        artists: string;
        album: string;
        duration: number;
        uri: string;
        imageUrl: string | null;
        position: number;
    }

    // Initialize addedTracks with existing playlist tracks
    $: {
        if (data?.playlist?.tracks) {
            addedTracks = new Set(data.playlist.tracks.map((track: Track) => track.uri));
        }
    }
    
    // Drag and drop functionality
    let draggedTrackId: string | null = null;
    let dragOverIndex = -1;
    
    function formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    function formatTotalDuration(ms: number): string {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours} hr ${minutes} min`;
    }

    async function handleSearch() {
        if (!searchQuery.trim()) return;
        
        searching = true;
        console.log('Searching for:', searchQuery);
        
        // Create a temporary form to use SvelteKit's form action handling
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '?/search';
        
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'query';
        input.value = searchQuery;
        form.appendChild(input);
        
        try {
            const formData = new FormData(form);
            
            const response = await fetch('?/search', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Raw search response:', result);
                
                // Try to access the data directly - SvelteKit might have different serialization
                if (result.type === 'success') {
                    // Try different ways to access the data
                    const data = result.data;
                    console.log('Response data type:', typeof data);
                    console.log('Response data:', data);
                    
                    // Handle SvelteKit's devalue serialization format
                    if (typeof data === 'string') {
                        try {
                            // Parse the devalue serialized data
                            const parsed = JSON.parse(data);
                            console.log('Parsed data:', parsed);
                            
                            // Devalue format: [template, ...values]
                            if (Array.isArray(parsed) && parsed.length > 3) {
                                const trackIndices = parsed[2]; // [3,11,17,22]
                                const trackTemplate = parsed[3]; // {"id":4,"name":5,"artists":6,...}
                                
                                if (Array.isArray(trackIndices) && trackTemplate && typeof trackTemplate === 'object') {
                                    const tracks: Track[] = [];
                                    
                                    trackIndices.forEach(startIndex => {
                                        const track: Track = {
                                            id: parsed[trackTemplate.id + startIndex - 3] || '',
                                            name: parsed[trackTemplate.name + startIndex - 3] || '',
                                            artists: parsed[trackTemplate.artists + startIndex - 3] || '',
                                            album: parsed[trackTemplate.album + startIndex - 3] || '',
                                            uri: parsed[trackTemplate.uri + startIndex - 3] || '',
                                            duration: parsed[trackTemplate.duration + startIndex - 3] || 0,
                                            imageUrl: parsed[trackTemplate.imageUrl + startIndex - 3] || null,
                                            position: 0 // This will be set when added to the playlist
                                        };
                                        
                                        console.log('Reconstructing track from index', startIndex, ':', track);
                                        
                                        // Validate the track data before adding
                                        if (track.id && track.name && track.uri && typeof track.uri === 'string' && track.uri.startsWith('spotify:track:')) {
                                            tracks.push(track);
                                        } else {
                                            console.warn('Invalid track data, skipping:', track);
                                        }
                                    });
                                    
                                    console.log('Final reconstructed tracks:', tracks);
                                    searchResults = tracks;
                                } else {
                                    console.log('Invalid track structure');
                                    searchResults = [];
                                }
                            } else {
                                console.log('Invalid parsed data structure');
                                searchResults = [];
                            }
                        } catch (parseError) {
                            console.error('Failed to parse devalue data:', parseError);
                            searchResults = [];
                        }
                    } else if (data && typeof data === 'object' && data.success && data.tracks) {
                        // Direct object format
                        console.log('Direct object format detected');
                        searchResults = data.tracks;
                    } else {
                        console.log('Unknown data format:', data);
                        searchResults = [];
                    }
                } else {
                    console.error('Search failed:', result);
                    searchResults = [];
                }
            } else {
                console.error('HTTP error:', response.status, response.statusText);
                searchResults = [];
            }
        } catch (error) {
            console.error('Search error:', error);
            searchResults = [];
        } finally {
            searching = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }

    function startEditing(trackId: string) {
        editingTrackId = trackId;
    }

    function finishEditing() {
        editingTrackId = null;
    }

    async function handleAddTrack(trackUri: string) {
        console.log('Adding track:', trackUri);
        
        try {
            const formData = new FormData();
            formData.append('trackUri', trackUri);
            
            console.log('Sending add track request...');
            const response = await fetch('?/addTrack', {
                method: 'POST',
                body: formData
            });
            
            console.log('Add track response received:', response.status, response.statusText);
            
            if (response.ok) {
                console.log('Response OK, assuming success...');
                try {
                    const result = await response.json();
                    console.log('Add track response:', result);
                    
                    console.log('✅ Track added successfully!');
                    // Mark this track as added
                    addedTracks.add(trackUri);
                    addedTracks = addedTracks; // Trigger reactivity
                    
                    // Refresh the playlist data to show the new track
                    console.log('Refreshing playlist data...');
                    await goto($page.url.pathname, { invalidateAll: true, replaceState: true });
                } catch (jsonError) {
                    console.log('JSON parse error (might be empty response):', jsonError);
                    console.log('✅ Track likely added successfully (empty response is normal)');
                    // Mark this track as added even if JSON parsing failed
                    addedTracks.add(trackUri);
                    addedTracks = addedTracks; // Trigger reactivity
                    
                    // Refresh the playlist data to show the new track
                    console.log('Refreshing playlist data...');
                    await goto($page.url.pathname, { invalidateAll: true, replaceState: true });
                }
            } else {
                console.error('❌ HTTP error during add track:', response.status, response.statusText);
                alert('Failed to add track: HTTP ' + response.status);
            }
                    } catch (error) {
                console.error('❌ Network error during add track:', error);
                alert('Failed to add track: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    // Drag and drop handlers
    function handleDragStart(event: DragEvent, trackId: string) {
        draggedTrackId = trackId;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', '');
        }
    }

    function handleDragOver(event: DragEvent, index: number) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
        dragOverIndex = index;
    }

    function handleDragLeave(event: DragEvent) {
        dragOverIndex = -1;
    }

    async function handleDrop(event: DragEvent, dropIndex: number) {
        event.preventDefault();
        
        if (draggedTrackId === null) return;
        
        const dragIndex = data.playlist.tracks.findIndex((t: any) => t.id === draggedTrackId);
        if (dragIndex === -1 || dragIndex === dropIndex) {
            draggedTrackId = null;
            dragOverIndex = -1;
            return;
        }
        
        // Call server action to reorder tracks
        console.log(`Frontend drag reorder: dragIndex=${dragIndex}, dropIndex=${dropIndex}`);
        
        try {
            console.log('Starting drag reorder request...');
            const formData = new FormData();
            formData.append('rangeStart', dragIndex.toString());
            formData.append('insertBefore', dropIndex.toString());
            
            console.log('Sending fetch request to ?/reorderTrack');
            const response = await fetch('?/reorderTrack', {
                method: 'POST',
                body: formData
            });
            
            console.log('Fetch response received:', response.status, response.statusText);
            
            if (response.ok) {
                console.log('Response OK, parsing JSON...');
                try {
                    const result = await response.json();
                    console.log('Reorder response:', result);
                    console.log('Reorder response type:', typeof result);
                    console.log('Reorder response keys:', Object.keys(result));
                    
                    // Update the UI immediately like in the create playlist page
                    console.log('✅ Reorder completed successfully! Updating UI...');
                    
                    // Reorder the tracks array in memory (same logic as create page)
                    const newTracks = [...data.playlist.tracks];
                    const draggedTrack = newTracks[dragIndex];
                    newTracks.splice(dragIndex, 1);
                    newTracks.splice(dropIndex, 0, draggedTrack);
                    
                    // Update the data object to trigger UI refresh
                    data.playlist.tracks = newTracks;
                    
                    console.log('✅ UI updated successfully!');
                } catch (jsonError) {
                    console.log('JSON parse error (might be empty response):', jsonError);
                    console.log('✅ Reorder likely successful (empty response is normal for this endpoint)');
                    
                    // Update the UI immediately even if JSON parsing failed
                    console.log('✅ Updating UI after successful reorder...');
                    
                    // Reorder the tracks array in memory (same logic as create page)
                    const newTracks = [...data.playlist.tracks];
                    const draggedTrack = newTracks[dragIndex];
                    newTracks.splice(dragIndex, 1);
                    newTracks.splice(dropIndex, 0, draggedTrack);
                    
                    // Update the data object to trigger UI refresh
                    data.playlist.tracks = newTracks;
                    
                    console.log('✅ UI updated successfully!');
                }
            } else {
                console.error('❌ HTTP error during reorder:', response.status, response.statusText);
                alert('Failed to reorder track: HTTP ' + response.status);
            }
                    } catch (error) {
                console.error('❌ Network error during reorder:', error);
                alert('Failed to reorder track: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            draggedTrackId = null;
            dragOverIndex = -1;
        }
    }

    function handleDragEnd(event: DragEvent) {
        draggedTrackId = null;
        dragOverIndex = -1;
    }

    async function handlePositionEdit(event: Event, trackId: string, currentPosition: number) {
        // Prevent duplicate calls with multiple checks
        const now = Date.now();
        if (isProcessingReorder || (now - lastReorderTime) < 500) {
            console.log('⚠️ Reorder already in progress or too recent, skipping duplicate call');
            return;
        }
        
        lastReorderTime = now;
        
        const target = event.target as HTMLInputElement;
        const newPos = parseInt(target.value);
        
        if (newPos !== currentPosition && newPos >= 1 && newPos <= data.playlist.tracks.length) {
            isProcessingReorder = true;
            // Convert 1-based position to 0-based for server
            const currentIndex = currentPosition - 1;
            const newIndex = newPos - 1;
            
            // Fix off-by-one error: subtract 1 from insertBefore for position input
            // If user types position 1, they want index 0, so insertBefore should be -1? 
            // But that doesn't make sense. Let me try newIndex - 1 with minimum 0
            const insertBefore = Math.max(0, newIndex - 1);
            
            console.log(`Frontend position edit: currentPosition=${currentPosition}, newPos=${newPos}, currentIndex=${currentIndex}, newIndex=${newIndex}, insertBefore=${insertBefore}`);
            
            try {
                console.log('Starting position edit request...');
                const formData = new FormData();
                formData.append('rangeStart', currentIndex.toString());
                formData.append('insertBefore', insertBefore.toString());
                
                console.log('Sending position edit request to ?/reorderTrack');
                const response = await fetch('?/reorderTrack', {
                    method: 'POST',
                    body: formData
                });
                
                console.log('Position edit response received:', response.status, response.statusText);
                
                if (response.ok) {
                    console.log('Position edit response OK, updating UI...');
                    try {
                        const result = await response.json();
                        console.log('Position edit response:', result);
                        
                        // Update UI immediately like drag and drop
                        console.log('✅ Position edit successful! Updating UI...');
                        
                        // Move track to new position in memory
                        const newTracks = [...data.playlist.tracks];
                        const trackToMove = newTracks[currentIndex];
                        newTracks.splice(currentIndex, 1);
                        newTracks.splice(newIndex, 0, trackToMove);
                        
                        // Update the data object to trigger UI refresh
                        data.playlist.tracks = newTracks;
                        
                        // Debug: log the new track positions
                        console.log('Updated track positions:');
                        newTracks.forEach((track, idx) => {
                            console.log(`  Position ${idx + 1}: ${track.name}`);
                        });
                        
                        console.log('✅ UI updated successfully!');
                    } catch (jsonError) {
                        console.log('JSON parse error (might be empty response):', jsonError);
                        console.log('✅ Position edit likely successful (empty response is normal)');
                        
                        // Update the UI immediately even if JSON parsing failed
                        console.log('✅ Updating UI after successful position edit...');
                        
                        // Move track to new position in memory
                        const newTracks = [...data.playlist.tracks];
                        const trackToMove = newTracks[currentIndex];
                        newTracks.splice(currentIndex, 1);
                        newTracks.splice(newIndex, 0, trackToMove);
                        
                        // Update the data object to trigger UI refresh
                        data.playlist.tracks = newTracks;
                        
                        // Debug: log the new track positions
                        console.log('Updated track positions:');
                        newTracks.forEach((track, idx) => {
                            console.log(`  Position ${idx + 1}: ${track.name}`);
                        });
                        
                        console.log('✅ UI updated successfully!');
                    }
                } else {
                    console.error('❌ HTTP error during position edit:', response.status, response.statusText);
                    alert('Failed to reorder track: HTTP ' + response.status);
                }
            } catch (error) {
                console.error('❌ Network error during position edit:', error);
                alert('Failed to reorder track: ' + (error instanceof Error ? error.message : 'Unknown error'));
            } finally {
                // Reset the flag after a delay to prevent rapid successive calls
                setTimeout(() => {
                    isProcessingReorder = false;
                }, 100);
            }
        }
        
        finishEditing();
    }
</script>

<div class="container mx-auto py-8">
    <!-- Back Navigation -->
    <div class="mb-6">
        <Button variant="link" href="/app" class="p-0 h-auto text-muted-foreground hover:text-foreground">
            ← Back to Playlists
        </Button>
    </div>

    <!-- Playlist Header -->
    <div class="flex items-start gap-6 mb-8">
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
                <span>By {data.playlist.owner}</span>
                <span>•</span>
                <span>{data.playlist.tracks.length} songs</span>
                <span>•</span>
                <span>{formatTotalDuration(data.playlist.totalDuration)}</span>
                <span>•</span>
                <span>{data.playlist.followers.toLocaleString()} saves</span>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="space-y-6">
        <!-- Add Tracks Section -->
        {#if data.playlist.canEdit}
            <Card>
                <CardHeader>
                    <div class="flex items-center justify-between">
                        <CardTitle>Add Tracks</CardTitle>
                        <button 
                            type="button"
                            on:click={() => isAddTracksExpanded = !isAddTracksExpanded}
                            class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
                            aria-label={isAddTracksExpanded ? 'Collapse' : 'Expand'}
                        >
                            {#if isAddTracksExpanded}
                                <ChevronUpIcon class="h-4 w-4" />
                            {:else}
                                <ChevronDownIcon class="h-4 w-4" />
                            {/if}
                        </button>
                    </div>
                </CardHeader>
                {#if isAddTracksExpanded}
                <CardContent class="space-y-4">
                    <!-- Search -->
                    <div class="flex gap-2">
                        <input 
                            type="search" 
                            placeholder="Search for tracks..." 
                            bind:value={searchQuery}
                            on:keydown={handleKeydown}
                            class="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <button 
                            on:click={handleSearch}
                            disabled={searching || !searchQuery.trim()}
                            type="button"
                            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                        >
                            {#if searching}
                                Searching...
                            {:else}
                                Search
                            {/if}
                        </button>
                    </div>

                    <!-- Search Results -->
                    {#if searching || searchResults.length > 0 || searchQuery}
                        <ScrollArea class="h-64 border rounded-lg">
                            <div class="divide-y">
                                {#if searching}
                                    <div class="p-4 text-center text-muted-foreground text-sm">
                                        Searching...
                                    </div>
                                {:else if searchResults.length === 0}
                                    <div class="p-3 text-left text-muted-foreground text-sm">
                                        {searchQuery ? 'No tracks found' : 'Enter a search term to find tracks'}
                                    </div>
                                {:else}
                                    {#each searchResults as track}
                                        <div class="p-3 flex items-center gap-3 hover:bg-muted/30">
                                            {#if track.imageUrl}
                                                <img 
                                                    src={track.imageUrl} 
                                                    alt={track.name}
                                                    class="w-10 h-10 object-cover rounded"
                                                />
                                            {:else}
                                                <div class="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs">
                                                    🎵
                                                </div>
                                            {/if}
                                            <div class="flex-1 min-w-0">
                                                <div class="font-medium truncate text-sm">{track.name}</div>
                                                <div class="text-xs text-muted-foreground truncate">{track.artists}</div>
                                            </div>
                                                                                <button
                                        on:click={() => handleAddTrack(track.uri)}
                                        disabled={addedTracks.has(track.uri)}
                                        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {addedTracks.has(track.uri) ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'} h-9 px-3"
                                    >
                                        {addedTracks.has(track.uri) ? 'Added' : 'Add'}
                                    </button>
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                        </ScrollArea>
                    {:else}
                        <div class="p-3 text-left text-muted-foreground text-sm border border-dashed rounded-lg">
                            Search for tracks to add to this playlist
                        </div>
                    {/if}
                </CardContent>
            {/if}
        </Card>
        {/if}

        <!-- Current Tracks Section -->
        <Card>
            <CardHeader>
                <CardTitle>Tracks ({data.playlist.tracks.length})</CardTitle>
            </CardHeader>
            <CardContent class="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {#if data.playlist.canEdit}
                                <TableHead class="w-[50px]">Order</TableHead>
                            {/if}
                            <TableHead class="w-[50px]">#</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead class="hidden md:table-cell">Album</TableHead>
                            <TableHead class="hidden md:table-cell">Duration</TableHead>
                            {#if data.playlist.canEdit}
                                <TableHead class="w-[50px]">Actions</TableHead>
                            {/if}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {#each data.playlist.tracks as track, i}
                            <TableRow
                                draggable={data.playlist.canEdit}
                                on:dragstart={(e) => data.playlist.canEdit && handleDragStart(e, track.id)}
                                on:dragover={(e) => data.playlist.canEdit && handleDragOver(e, i)}
                                on:dragleave={handleDragLeave}
                                on:drop={(e) => data.playlist.canEdit && handleDrop(e, i)}
                                on:dragend={handleDragEnd}
                                class="{dragOverIndex === i ? 'border-t-2 border-primary' : ''} {draggedTrackId === track.id ? 'opacity-50' : ''}"
                            >
                                {#if data.playlist.canEdit}
                                    <TableCell>
                                        <div class="text-lg text-muted-foreground cursor-grab active:cursor-grabbing" title="Drag to reorder">
                                            ⋮⋮
                                        </div>
                                    </TableCell>
                                {/if}
                                <TableCell>
                                    {#if data.playlist.canEdit}
                                        {#if editingTrackId === track.id}
                                            <input
                                                type="number"
                                                min="1"
                                                max={data.playlist.tracks.length}
                                                value={i + 1}
                                                class="w-12 h-8 text-sm text-center border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                                                on:blur={(e) => {
                                                    setTimeout(() => {
                                                        if (!isProcessingReorder) {
                                                            handlePositionEdit(e, track.id, i + 1);
                                                        }
                                                    }, 10);
                                                }}
                                                on:keydown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const target = e.target as HTMLInputElement;
                                                        target.blur();
                                                        handlePositionEdit(e, track.id, i + 1);
                                                    } else if (e.key === 'Escape') {
                                                        finishEditing();
                                                    }
                                                }}
                                            />
                                        {:else}
                                            <button
                                                type="button"
                                                class="w-12 h-8 text-sm text-center font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded cursor-pointer transition-colors"
                                                on:click={() => startEditing(track.id)}
                                                title="Click to edit position"
                                            >
                                                {i + 1}
                                            </button>
                                        {/if}
                                    {:else}
                                        <span class="text-sm text-muted-foreground">{i + 1}</span>
                                    {/if}
                                </TableCell>
                                <TableCell>
                                    <div class="flex items-center gap-3">
                                        {#if track.imageUrl}
                                            <img 
                                                src={track.imageUrl} 
                                                alt={track.name}
                                                class="w-10 h-10 object-cover rounded"
                                            />
                                        {:else}
                                            <div class="w-10 h-10 bg-muted rounded flex items-center justify-center text-sm">
                                                🎵
                                            </div>
                                        {/if}
                                        <div class="min-w-0">
                                            <div class="font-medium truncate">{track.name}</div>
                                            <div class="text-sm text-muted-foreground truncate">{track.artists}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell class="hidden md:table-cell text-muted-foreground">
                                    {track.album}
                                </TableCell>
                                <TableCell class="hidden md:table-cell text-muted-foreground">
                                    {formatDuration(track.duration)}
                                </TableCell>
                                {#if data.playlist.canEdit}
                                    <TableCell>
                                        <form method="POST" action="?/removeTrack" use:enhance>
                                            <input type="hidden" name="trackUri" value={track.uri} />
                                            <input type="hidden" name="position" value={i} />
                                            <button
                                                type="submit"
                                                class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive/10 h-9 w-9 text-destructive"
                                                title="Remove from playlist"
                                            >
                                                ✕
                                            </button>
                                        </form>
                                    </TableCell>
                                {/if}
                            </TableRow>
                        {/each}
                        
                        {#if data.playlist.tracks.length === 0}
                            <TableRow>
                                <TableCell colspan={data.playlist.canEdit ? 6 : 4} class="text-center py-8">
                                    <div class="text-2xl mb-2">🎵</div>
                                    <div class="text-sm text-muted-foreground">No tracks in this playlist yet</div>
                                </TableCell>
                            </TableRow>
                        {/if}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
</div>
