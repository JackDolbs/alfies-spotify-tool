<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { ScrollArea } from "$lib/components/ui/scroll-area";
    // Using native HTML elements for checkbox and badges
    import SearchIcon from "@lucide/svelte/icons/search";
    import ShoppingCartIcon from "@lucide/svelte/icons/shopping-cart";
    import PlusIcon from "@lucide/svelte/icons/plus";
    import TrashIcon from "@lucide/svelte/icons/trash-2";
    import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
    import type { PageData, ActionData } from './$types';

    export let data: PageData;
    export let form: ActionData;
    
    // Search functionality
    let searchQuery = '';
    let searchResults: Track[] = [];
    let searching = false;
    
    // Cart system - selected tracks
    let selectedTracks: Track[] = [];
    
    // Playlist selection
    let selectedPlaylistIds: Set<string> = new Set();
    
    // Processing state
    let isProcessing = false;
    let showResults = false;
    
    interface Track {
        id: string;
        name: string;
        artists: string;
        album: string;
        duration: number;
        uri: string;
        imageUrl: string | null;
    }

    function formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async function handleSearch() {
        if (!searchQuery.trim()) return;
        
        searching = true;
        console.log('Searching for:', searchQuery);
        
        try {
            const formData = new FormData();
            formData.append('query', searchQuery);
            
            const response = await fetch('?/search', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Raw search response:', result);
                
                if (result.type === 'success') {
                    // Try to access the data directly - SvelteKit might have different serialization
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
                                const trackIndices = parsed[2]; // [3,11,17,22,...]
                                const trackTemplate = parsed[3]; // {"id":4,"name":5,"artists":6,...}
                                
                                console.log('Track indices:', trackIndices);
                                console.log('Track template:', trackTemplate);
                                console.log('Parsed array length:', parsed.length);
                                
                                if (Array.isArray(trackIndices) && trackTemplate && typeof trackTemplate === 'object') {
                                    const tracks: Track[] = [];
                                    
                                    trackIndices.forEach((startIndex, trackNum) => {
                                        console.log(`Processing track ${trackNum + 1} at index ${startIndex}`);
                                        
                                        // Try different offset calculations
                                        const offsets = [-4, -3, -2, -1, 0, 1];
                                        let track: Track | null = null;
                                        
                                        for (const offset of offsets) {
                                            const testTrack: Track = {
                                                id: parsed[startIndex + trackTemplate.id + offset] || '',
                                                name: parsed[startIndex + trackTemplate.name + offset] || '',
                                                artists: parsed[startIndex + trackTemplate.artists + offset] || '',
                                                album: parsed[startIndex + trackTemplate.album + offset] || '',
                                                uri: parsed[startIndex + trackTemplate.uri + offset] || '',
                                                duration: parsed[startIndex + trackTemplate.duration + offset] || 0,
                                                imageUrl: parsed[startIndex + trackTemplate.imageUrl + offset] || null
                                            };
                                            
                                            // Check if this offset produces valid data
                                            if (testTrack.id && testTrack.name && testTrack.uri && 
                                                typeof testTrack.uri === 'string' && testTrack.uri.startsWith('spotify:track:')) {
                                                track = testTrack;
                                                console.log(`Found valid track with offset ${offset}:`, track);
                                                break;
                                            }
                                        }
                                        
                                        if (!track) {
                                            console.warn('Could not reconstruct track at index', startIndex);
                                            console.log('Template:', trackTemplate);
                                            console.log('Available values around index:', {
                                                'index-2': parsed[startIndex - 2],
                                                'index-1': parsed[startIndex - 1],
                                                'index': parsed[startIndex],
                                                'index+1': parsed[startIndex + 1],
                                                'index+2': parsed[startIndex + 2]
                                            });
                                            return;
                                        }
                                        
                                        console.log('Reconstructed track:', track);
                                        
                                        // Add the valid track
                                        tracks.push(track);
                                    });
                                    
                                    console.log('Final reconstructed tracks count:', tracks.length);
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
                console.error('HTTP error:', response.status);
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

    function addToCart(track: Track) {
        if (!selectedTracks.find(t => t.id === track.id)) {
            selectedTracks = [...selectedTracks, track];
        }
    }

    function removeFromCart(trackId: string) {
        selectedTracks = selectedTracks.filter(t => t.id !== trackId);
    }

    function clearCart() {
        selectedTracks = [];
    }

    function togglePlaylist(playlistId: string) {
        if (selectedPlaylistIds.has(playlistId)) {
            selectedPlaylistIds.delete(playlistId);
        } else {
            selectedPlaylistIds.add(playlistId);
        }
        selectedPlaylistIds = new Set(selectedPlaylistIds); // Trigger reactivity
    }

    function selectAllPlaylists() {
        selectedPlaylistIds = new Set(data.playlists.map(p => p.id));
    }

    function clearPlaylistSelection() {
        selectedPlaylistIds = new Set();
    }

    async function handleBulkAdd() {
        if (selectedTracks.length === 0) {
            alert('Please select at least one track');
            return;
        }
        
        if (selectedPlaylistIds.size === 0) {
            alert('Please select at least one playlist');
            return;
        }

        isProcessing = true;
        
        try {
            const formData = new FormData();
            formData.append('trackUris', JSON.stringify(selectedTracks.map(t => t.uri)));
            formData.append('playlistIds', JSON.stringify(Array.from(selectedPlaylistIds)));
            
            const response = await fetch('?/bulkAdd', {
                method: 'POST',
                body: formData
            });
            
            console.log('📡 Response status:', response.status, response.statusText);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                const result = await response.json();
                console.log('📦 Raw bulk add result:', result);
                console.log('📦 Result type:', result.type);
                console.log('📦 Result data:', result.data);
                console.log('📦 Current form state before update:', form);
                
                // Handle the response properly
                if (result.type === 'success' && result.data) {
                    console.log('✅ Success response detected');
                    
                    // Parse devalue format if needed
                    let parsedData = result.data;
                    if (typeof result.data === 'string') {
                        try {
                            const parsed = JSON.parse(result.data);
                            console.log('📦 Parsed devalue data:', parsed);
                            
                            // Reconstruct the response object from devalue format
                            if (Array.isArray(parsed) && parsed.length > 1) {
                                const template = parsed[0]; // {"success":1,"message":2,"results":3,"stats":9}
                                const statsTemplate = parsed[template.stats]; // {"total":10,"success":10,"errors":11}
                                
                                parsedData = {
                                    success: parsed[template.success] || false,
                                    message: parsed[template.message] || '',
                                    results: parsed[template.results] || [],
                                    stats: {
                                        total: parsed[statsTemplate.total] || 0,
                                        success: parsed[statsTemplate.success] || 0,
                                        errors: parsed[statsTemplate.errors] || 0
                                    }
                                };
                                console.log('📦 Reconstructed response:', parsedData);
                                console.log('📦 Stats template:', statsTemplate);
                                console.log('📦 Final stats:', parsedData.stats);
                            }
                        } catch (parseError) {
                            console.error('Failed to parse devalue response:', parseError);
                            parsedData = result.data;
                        }
                    } else if (typeof result.data === 'object') {
                        parsedData = result.data;
                    }
                    
                    // Update form data to show results
                    form = parsedData;
                    console.log('📦 Form updated to:', form);
                    showResults = true;
                    console.log('📦 showResults set to:', showResults);
                    
                    // Clear selections on success
                    if (parsedData.success) {
                        console.log('🧹 Clearing selections...');
                        selectedTracks = [];
                        selectedPlaylistIds = new Set();
                        searchResults = [];
                        searchQuery = '';
                        console.log('🧹 Selections cleared');
                    }
                } else if (result.type === 'error') {
                    console.error('Bulk add failed:', result);
                    alert('Failed to add tracks: ' + (result.error || 'Unknown error'));
                } else {
                    console.log('Unexpected result format:', result);
                    alert('Unexpected response format. Check console for details.');
                }
            } else {
                console.error('HTTP error:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                alert(`HTTP Error ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Bulk add error:', error);
        } finally {
            isProcessing = false;
        }
    }

    // Group playlists by account for better organization
    $: playlistsByAccount = data.playlists.reduce((acc, playlist) => {
        if (!acc[playlist.accountName]) {
            acc[playlist.accountName] = [];
        }
        acc[playlist.accountName].push(playlist);
        return acc;
    }, {} as Record<string, typeof data.playlists>);

    // Calculate totals
    $: totalOperations = selectedTracks.length * selectedPlaylistIds.size;
</script>

<div class="container mx-auto py-8">
    <!-- Header -->
    <div class="mb-6">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h1 class="text-3xl font-bold">Bulk Add Songs</h1>
                <p class="text-muted-foreground">Add multiple songs to multiple playlists across all your accounts</p>
            </div>
            <Button variant="link" href="/app" class="p-0 h-auto text-muted-foreground hover:text-foreground">
                ← Back to Playlists
            </Button>
        </div>

        <!-- Stats -->
        {#if selectedTracks.length > 0 || selectedPlaylistIds.size > 0}
            <div class="flex gap-4 text-sm text-muted-foreground">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs">
                    <ShoppingCartIcon class="h-3 w-3" />
                    {selectedTracks.length} song{selectedTracks.length === 1 ? '' : 's'}
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs">
                    <PlusIcon class="h-3 w-3" />
                    {selectedPlaylistIds.size} playlist{selectedPlaylistIds.size === 1 ? '' : 's'}
                </span>
                {#if totalOperations > 0}
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-input bg-background text-xs">
                        = {totalOperations} total operation{totalOperations === 1 ? '' : 's'}
                    </span>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Results Display -->
    <!-- Debug: form={JSON.stringify(form)}, showResults={showResults} -->
    {#if form?.success && showResults}
        <Card class="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardHeader>
                <CardTitle class="text-green-800 dark:text-green-200 flex items-center gap-2">
                    <CheckCircleIcon class="h-5 w-5" />
                    Bulk Add Complete!
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p class="text-green-700 dark:text-green-300">{form.message}</p>
                <Button variant="outline" size="sm" class="mt-3" onclick={() => showResults = false}>
                    Dismiss
                </Button>
            </CardContent>
        </Card>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column: Song Search & Cart -->
        <div class="space-y-6">
            <!-- Song Search -->
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <SearchIcon class="h-5 w-5" />
                        Search Songs
                    </CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <!-- Search Input -->
                    <div class="flex gap-2">
                        <Input 
                            type="search" 
                            placeholder="Search for tracks..." 
                            bind:value={searchQuery}
                            onkeydown={handleKeydown}
                            class="flex-1"
                        />
                        <Button 
                            onclick={handleSearch}
                            disabled={searching || !searchQuery.trim()}
                        >
                            {#if searching}
                                Searching...
                            {:else}
                                Search
                            {/if}
                        </Button>
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
                                            <Button
                                                size="sm"
                                                variant={selectedTracks.find(t => t.id === track.id) ? "secondary" : "default"}
                                                disabled={!!selectedTracks.find(t => t.id === track.id)}
                                                onclick={() => addToCart(track)}
                                            >
                                                {selectedTracks.find(t => t.id === track.id) ? 'Added' : 'Add'}
                                            </Button>
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                        </ScrollArea>
                    {:else}
                        <div class="p-3 text-left text-muted-foreground text-sm border border-dashed rounded-lg">
                            Search for tracks to add to your cart
                        </div>
                    {/if}
                </CardContent>
            </Card>

            <!-- Song Cart -->
            <Card>
                <CardHeader>
                    <div class="flex items-center justify-between">
                        <CardTitle class="flex items-center gap-2">
                            <ShoppingCartIcon class="h-5 w-5" />
                            Selected Songs ({selectedTracks.length})
                        </CardTitle>
                        {#if selectedTracks.length > 0}
                            <Button variant="outline" size="sm" onclick={clearCart}>
                                <TrashIcon class="h-4 w-4" />
                                Clear All
                            </Button>
                        {/if}
                    </div>
                </CardHeader>
                <CardContent>
                    {#if selectedTracks.length === 0}
                        <div class="p-4 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
                            No songs selected. Search and add songs to get started.
                        </div>
                    {:else}
                        <ScrollArea class="h-64">
                            <div class="space-y-2">
                                {#each selectedTracks as track}
                                    <div class="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                        {#if track.imageUrl}
                                            <img 
                                                src={track.imageUrl} 
                                                alt={track.name}
                                                class="w-8 h-8 object-cover rounded"
                                            />
                                        {:else}
                                            <div class="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                                                🎵
                                            </div>
                                        {/if}
                                        <div class="flex-1 min-w-0">
                                            <div class="font-medium truncate text-sm">{track.name}</div>
                                            <div class="text-xs text-muted-foreground truncate">{track.artists}</div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onclick={() => removeFromCart(track.id)}
                                        >
                                            <TrashIcon class="h-4 w-4" />
                                        </Button>
                                    </div>
                                {/each}
                            </div>
                        </ScrollArea>
                    {/if}
                </CardContent>
            </Card>
        </div>

        <!-- Right Column: Playlist Selection -->
        <div class="space-y-6">
            <!-- Playlist Selection -->
            <Card>
                <CardHeader>
                    <div class="flex items-center justify-between">
                        <CardTitle>
                            Select Playlists ({selectedPlaylistIds.size} selected)
                        </CardTitle>
                        <div class="flex gap-2">
                            <Button variant="outline" size="sm" onclick={selectAllPlaylists}>
                                Select All
                            </Button>
                            <Button variant="outline" size="sm" onclick={clearPlaylistSelection}>
                                Clear
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea class="h-96">
                        <div class="space-y-4">
                            {#each Object.entries(playlistsByAccount) as [accountName, playlists]}
                                <div>
                                    <h3 class="font-medium text-sm text-muted-foreground mb-2">{accountName}</h3>
                                    <div class="space-y-2">
                                        {#each playlists as playlist}
                                            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedPlaylistIds.has(playlist.id)}
                                                    on:change={() => togglePlaylist(playlist.id)}
                                                    class="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring"
                                                />
                                                {#if playlist.imageUrl}
                                                    <img 
                                                        src={playlist.imageUrl} 
                                                        alt={playlist.name}
                                                        class="w-8 h-8 object-cover rounded"
                                                    />
                                                {:else}
                                                    <div class="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                                                        🎵
                                                    </div>
                                                {/if}
                                                <div class="flex-1 min-w-0">
                                                    <div class="font-medium truncate text-sm">{playlist.name}</div>
                                                    <div class="text-xs text-muted-foreground">
                                                        {playlist.trackCount} tracks • {playlist.owner}
                                                    </div>
                                                </div>
                                                {#if playlist.canEdit}
                                                    <span class="px-2 py-1 text-xs border border-input rounded-md bg-background">Editable</span>
                                                {/if}
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <!-- Bulk Add Action -->
            <Card>
                <CardHeader>
                    <CardTitle>Ready to Add?</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="space-y-4">
                        <div class="text-sm text-muted-foreground">
                            {#if totalOperations > 0}
                                This will add <strong>{selectedTracks.length} song{selectedTracks.length === 1 ? '' : 's'}</strong> 
                                to <strong>{selectedPlaylistIds.size} playlist{selectedPlaylistIds.size === 1 ? '' : 's'}</strong>
                                (<strong>{totalOperations} total operation{totalOperations === 1 ? '' : 's'}</strong>)
                            {:else}
                                Select songs and playlists to get started
                            {/if}
                        </div>
                        
                        <Button 
                            class="w-full"
                            disabled={selectedTracks.length === 0 || selectedPlaylistIds.size === 0 || isProcessing}
                            onclick={handleBulkAdd}
                        >
                            {#if isProcessing}
                                Adding Songs...
                            {:else}
                                Add All Songs to Selected Playlists
                            {/if}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
</div>
