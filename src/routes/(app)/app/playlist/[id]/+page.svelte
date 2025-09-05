<script lang="ts">
    import { enhance } from "$app/forms";
    import { invalidateAll } from "$app/navigation";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { ScrollArea } from "$lib/components/ui/scroll-area";
    import type { PageData, ActionData } from './$types';

    export let data: PageData;
    export const form: ActionData = null;
    
    // Search functionality
    let searchQuery = '';
    let searchResults: any[] = [];
    let searching = false;
    
    // Track management state
    let editingTrackId: string | null = null;
    
    // Drag and drop functionality
    let draggedTrackId: string | null = null;
    let dragOverIndex = -1;
    
    function formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async function handleSearch() {
        if (!searchQuery.trim()) return;
        
        searching = true;
        try {
            const formData = new FormData();
            formData.append('query', searchQuery);
            
            const response = await fetch('?/search', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            if (result.type === 'success' && result.data?.success) {
                searchResults = result.data.tracks || [];
            } else {
                console.error('Search failed:', result.data?.error);
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
        try {
            const formData = new FormData();
            formData.append('trackUri', trackUri);
            
            const response = await fetch('?/addTrack', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Add track response:', result);
                
                // SvelteKit form actions return different response formats
                const isSuccess = result.success || 
                                (result.type === 'success' && result.data?.success) ||
                                (result.type === 'success' && result.data?.message);
                
                if (isSuccess) {
                    // Don't refresh data immediately to avoid redirect
                    console.log('Track added successfully - operation completed');
                } else {
                    const errorMsg = result.error || result.data?.error || result.data?.message || 'Unknown error';
                    console.error('Add track failed:', errorMsg);
                    alert('Failed to add track: ' + errorMsg);
                }
            } else {
                console.error('HTTP error during add track:', response.status, response.statusText);
                alert('Failed to add track: HTTP ' + response.status);
            }
        } catch (error) {
            console.error('Error during add track:', error);
            alert('Failed to add track: ' + error.message);
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
            alert('Failed to reorder track: ' + error.message);
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
        const target = event.target as HTMLInputElement;
        const newPos = parseInt(target.value);
        
        if (newPos !== currentPosition && newPos >= 1 && newPos <= data.playlist.tracks.length) {
            // Convert 1-based position to 0-based for server
            const currentIndex = currentPosition - 1;
            const newIndex = newPos - 1;
            
            console.log(`Frontend position edit: currentPosition=${currentPosition}, newPos=${newPos}, currentIndex=${currentIndex}, newIndex=${newIndex}`);
            
            try {
                const formData = new FormData();
                formData.append('rangeStart', currentIndex.toString());
                formData.append('insertBefore', newIndex.toString());
                
                const response = await fetch('?/reorderTrack', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Position edit response:', result);
                    
                    // SvelteKit form actions return different response formats
                    const isSuccess = result.success || 
                                    (result.type === 'success' && result.data?.success) ||
                                    (result.type === 'success' && result.data?.message);
                    
                    if (isSuccess) {
                        // Update UI immediately like drag and drop
                        console.log('✅ Position edit successful! Updating UI...');
                        
                        // Move track to new position in memory
                        const newTracks = [...data.playlist.tracks];
                        const trackToMove = newTracks[currentIndex];
                        newTracks.splice(currentIndex, 1);
                        newTracks.splice(newIndex, 0, trackToMove);
                        
                        // Update the data object to trigger UI refresh
                        data.playlist.tracks = newTracks;
                        
                        console.log('✅ UI updated successfully!');
                    } else {
                        const errorMsg = result.error || result.data?.error || result.data?.message || 'Unknown error';
                        console.error('Position edit failed:', errorMsg);
                        alert('Failed to reorder track: ' + errorMsg);
                    }
                } else {
                    console.error('HTTP error during position edit:', response.status, response.statusText);
                    alert('Failed to reorder track: HTTP ' + response.status);
                }
            } catch (error) {
                console.error('Error during position edit:', error);
                alert('Failed to reorder track: ' + error.message);
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
                <span>{data.playlist.tracks.length} tracks</span>
                <span>•</span>
                <span>{data.playlist.followers} followers</span>
                <span>•</span>
                <span>{data.playlist.public ? 'Public' : 'Private'}</span>
            </div>
        </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Track Management -->
        <div class="lg:col-span-2 space-y-6">
            <!-- Current Tracks -->
            <Card>
                <CardHeader>
                    <CardTitle>Tracks ({data.playlist.tracks.length})</CardTitle>
                </CardHeader>
                <CardContent class="p-0">
                    <div class="divide-y">
                        {#each data.playlist.tracks as track, i}
                            <div 
                                class="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors {dragOverIndex === i ? 'border-t-2 border-primary' : ''} {draggedTrackId === track.id ? 'opacity-50' : ''}"
                                draggable="true"
                                role="listitem"
                                on:dragstart={(e) => handleDragStart(e, track.id)}
                                on:dragover={(e) => handleDragOver(e, i)}
                                on:dragleave={handleDragLeave}
                                on:drop={(e) => handleDrop(e, i)}
                                on:dragend={handleDragEnd}
                            >
                                <!-- Drag Handle -->
                                <div class="text-lg text-muted-foreground cursor-grab active:cursor-grabbing" title="Drag to reorder">
                                    ⋮⋮
                                </div>

                                <!-- Position & Controls -->
                                <div class="flex items-center gap-2">
                                    {#if editingTrackId === track.id}
                                        <input
                                            type="number"
                                            min="1"
                                            max={data.playlist.tracks.length}
                                            value={i + 1}
                                            class="w-8 h-6 text-sm text-center border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                                            on:blur={(e) => handlePositionEdit(e, track.id, i + 1)}
                                            on:keydown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handlePositionEdit(e, track.id, i + 1);
                                                } else if (e.key === 'Escape') {
                                                    finishEditing();
                                                }
                                            }}
                                        />
                                    {:else}
                                        <button
                                            type="button"
                                            class="w-8 h-6 text-sm text-center font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded cursor-pointer transition-colors flex items-center justify-center border-0 bg-transparent"
                                            on:click={() => startEditing(track.id)}
                                            title="Click to edit position"
                                        >
                                            {i + 1}
                                        </button>
                                    {/if}
                                </div>

                                <!-- Track Info -->
                                {#if track.imageUrl}
                                    <img 
                                        src={track.imageUrl} 
                                        alt={track.name}
                                        class="w-12 h-12 object-cover rounded"
                                    />
                                {:else}
                                    <div class="w-12 h-12 bg-muted rounded flex items-center justify-center text-sm">
                                        🎵
                                    </div>
                                {/if}

                                <div class="flex-1 min-w-0">
                                    <div class="font-medium truncate">{track.name}</div>
                                    <div class="text-sm text-muted-foreground truncate">{track.artists}</div>
                                </div>

                                <div class="text-sm text-muted-foreground hidden md:block">
                                    {formatDuration(track.duration)}
                                </div>

                                <!-- Actions -->
                                <form method="POST" action="?/removeTrack" use:enhance>
                                    <input type="hidden" name="trackUri" value={track.uri} />
                                    <input type="hidden" name="position" value={i} />
                                    <button
                                        type="submit"
                                        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive/10 h-9 w-9 text-destructive shrink-0 cursor-pointer"
                                        title="Remove from playlist"
                                    >
                                        ✕
                                    </button>
                                </form>
                            </div>
                        {/each}
                        
                        {#if data.playlist.tracks.length === 0}
                            <div class="p-8 text-center text-muted-foreground">
                                <div class="text-2xl mb-2">🎵</div>
                                <div class="text-sm">No tracks in this playlist yet</div>
                            </div>
                        {/if}
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Right Column: Add Tracks -->
        <div class="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Add Tracks</CardTitle>
                </CardHeader>
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
                    <ScrollArea class="h-96 border rounded-lg">
                        <div class="divide-y">
                            {#if searching}
                                <div class="p-4 text-center text-muted-foreground text-sm">
                                    Searching...
                                </div>
                            {:else if searchResults.length === 0}
                                <div class="p-4 text-center text-muted-foreground text-sm">
                                    {searchQuery ? 'No tracks found' : 'Search for tracks to add'}
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
                                            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 cursor-pointer"
                                        >
                                            Add
                                        </button>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    </div>
</div>
