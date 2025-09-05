<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Label } from "$lib/components/ui/label";
    import * as ContextMenu from "$lib/components/ui/context-menu";
    import { ScrollArea } from "$lib/components/ui/scroll-area";
    import type { ActionData } from './$types';

    export let form: ActionData;
    
    let creating = false;
    let name = '';
    let description = '';
    let selectedTracks: any[] = [];
    let searchQuery = '';
    let searchResults: any[] = [];
    let searching = false;
    let playlistImage: File | null = null;
    let imagePreview: string | null = null;

    // Track completion status
    $: detailsComplete = name.trim().length > 0;
    $: tracksComplete = true; // Tracks are optional
    $: canCreate = detailsComplete;

    function resetForm() {
        name = '';
        description = '';
        playlistImage = null;
        imagePreview = null;
        creating = false;
        selectedTracks = [];
        searchQuery = '';
        searchResults = [];
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
                            // From logs: [{"success":1,"tracks":2},true,[3,11,17,22],{"id":4,"name":5,"artists":6,"album":7,"uri":8,"duration":9,"imageUrl":10},"7qiZfU4dY1lWllzX7mPBI3","Shape of You","Ed Sheeran",...]
                            
                            if (Array.isArray(parsed) && parsed.length > 3) {
                                // Index 0: {success: 1, tracks: 2}
                                // Index 1: true (success value)
                                // Index 2: [3,11,17,22] (track indices)
                                // Index 3: track template object
                                // Index 4+: actual values
                                
                                const trackIndices = parsed[2]; // [3,11,17,22]
                                const trackTemplate = parsed[3]; // {"id":4,"name":5,"artists":6,...}
                                
                                if (Array.isArray(trackIndices) && trackTemplate && typeof trackTemplate === 'object') {
                                    const tracks = [];
                                    
                                    trackIndices.forEach(startIndex => {
                                        const track = {
                                            id: parsed[trackTemplate.id + startIndex - 3] || '',
                                            name: parsed[trackTemplate.name + startIndex - 3] || '',
                                            artists: parsed[trackTemplate.artists + startIndex - 3] || '',
                                            album: parsed[trackTemplate.album + startIndex - 3] || '',
                                            uri: parsed[trackTemplate.uri + startIndex - 3] || '',
                                            duration: parsed[trackTemplate.duration + startIndex - 3] || 0,
                                            imageUrl: parsed[trackTemplate.imageUrl + startIndex - 3] || null
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
                                    console.error('Could not find track indices or template');
                                    searchResults = [];
                                }
                            } else {
                                console.error('Unexpected parsed data structure:', parsed);
                                searchResults = [];
                            }
                        } catch (parseError) {
                            console.error('Failed to parse serialized data:', parseError);
                            searchResults = [];
                        }
                    } else if (data && typeof data === 'object' && data.success && data.tracks) {
                        // Normal object format
                        searchResults = data.tracks;
                        console.log('Found tracks:', searchResults);
                    } else {
                        console.error('Unexpected data format:', data);
                        searchResults = [];
                    }
                } else {
                    console.error('Response type not success:', result.type);
                    searchResults = [];
                }
            } else {
                console.error('Response not ok:', response.status, response.statusText);
                searchResults = [];
            }
        } catch (error) {
            console.error('Search error:', error);
            searchResults = [];
        } finally {
            searching = false;
        }
    }

    function addTrack(track: any) {
        if (!selectedTracks.find(t => t.id === track.id)) {
            selectedTracks = [...selectedTracks, track];
        }
    }

    function removeTrack(trackId: string) {
        selectedTracks = selectedTracks.filter(t => t.id !== trackId);
    }

    function moveTrackToPosition(trackId: string, newPosition: number) {
        // Validate position
        if (newPosition < 1 || newPosition > selectedTracks.length) {
            return;
        }
        
        // Find the track to move
        const trackIndex = selectedTracks.findIndex(t => t.id === trackId);
        if (trackIndex === -1) return;
        
        // Remove track from current position
        const track = selectedTracks[trackIndex];
        const newTracks = [...selectedTracks];
        newTracks.splice(trackIndex, 1);
        
        // Insert at new position (convert to 0-based index)
        newTracks.splice(newPosition - 1, 0, track);
        
        selectedTracks = newTracks;
    }

    // Drag and drop functionality
    let draggedTrackId = null;
    let dragOverIndex = -1;

    function handleDragStart(event, trackId) {
        draggedTrackId = trackId;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target);
    }

    function handleDragOver(event, index) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        dragOverIndex = index;
    }

    function handleDragLeave(event) {
        dragOverIndex = -1;
    }

    function handleDrop(event, dropIndex) {
        event.preventDefault();
        
        if (draggedTrackId === null) return;
        
        const dragIndex = selectedTracks.findIndex(t => t.id === draggedTrackId);
        if (dragIndex === -1 || dragIndex === dropIndex) {
            draggedTrackId = null;
            dragOverIndex = -1;
            return;
        }
        
        // Reorder the tracks
        const newTracks = [...selectedTracks];
        const draggedTrack = newTracks[dragIndex];
        newTracks.splice(dragIndex, 1);
        newTracks.splice(dropIndex, 0, draggedTrack);
        
        selectedTracks = newTracks;
        draggedTrackId = null;
        dragOverIndex = -1;
    }

    function handleDragEnd(event) {
        draggedTrackId = null;
        dragOverIndex = -1;
    }

    function formatDuration(ms: number): string {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }

    function handleImageUpload(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (file) {
            // Validate file type (JPEG only for Spotify)
            if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/jpg')) {
                alert('Please select a JPEG image file.');
                return;
            }
            
            // Validate file size (max 256KB for Spotify)
            if (file.size > 256 * 1024) {
                alert('Image must be smaller than 256KB.');
                return;
            }
            
            playlistImage = file;
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    function removeImage() {
        playlistImage = null;
        imagePreview = null;
    }

    function triggerImageUpload() {
        const fileInput = document.getElementById('playlist-image') as HTMLInputElement;
        fileInput?.click();
    }
</script>

<div class="container mx-auto p-4">
    <div class="mb-6">
        <Button variant="link" href="/app" class="p-0 h-auto text-muted-foreground hover:text-foreground">
            ← Back to Playlists
        </Button>
    </div>
    
    <div class="mb-8">
        <h1 class="text-3xl font-bold">Create New Playlist</h1>
        <p class="text-muted-foreground mt-2">Fill in the details below to create your new playlist</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <!-- Left Column: All Cards -->
        <div class="lg:col-span-3 space-y-6">
            <!-- Step 1: Basic Details -->
            <Card>
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            1
                        </div>
                        <div>
                            <CardTitle>Basic Details</CardTitle>
                            <CardDescription>Set your playlist name and description</CardDescription>
                        </div>
                        {#if detailsComplete}
                            <div class="ml-auto text-green-600">✓</div>
                        {/if}
                    </div>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="space-y-4">
                        <div class="space-y-2">
                            <Label for="name">Playlist Name *</Label>
                            <Input 
                                id="name"
                                type="text" 
                                bind:value={name}
                                placeholder="My Awesome Playlist"
                                required
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="description">Description (optional)</Label>
                            <Textarea 
                                id="description"
                                bind:value={description}
                                placeholder="What's this playlist about? Describe the mood, genre, or occasion..."
                                rows={4}
                                class="resize-none"
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="playlist-image">Playlist Image (optional)</Label>
                            <!-- Context Menu Image preview - bigger and left-aligned -->
                            <ContextMenu.Root>
                                <ContextMenu.Trigger>
                                    <div 
                                        class="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden bg-muted/10 cursor-pointer hover:border-muted-foreground/40 transition-colors"
                                        on:click={triggerImageUpload}
                                    >
                                        {#if imagePreview}
                                            <img 
                                                src={imagePreview} 
                                                alt="Playlist preview"
                                                class="w-full h-full object-cover"
                                            />
                                        {:else}
                                            <div class="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                                <div class="text-3xl mb-1">🖼️</div>
                                                <div class="text-xs text-center px-2">
                                                    Click to upload
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                </ContextMenu.Trigger>
                                <ContextMenu.Content class="w-48">
                                    <ContextMenu.Item on:click={triggerImageUpload}>
                                        <div class="flex items-center gap-2">
                                            <span>📁</span>
                                            {imagePreview ? 'Change Image' : 'Upload Image'}
                                        </div>
                                    </ContextMenu.Item>
                                    {#if imagePreview}
                                        <ContextMenu.Separator />
                                        <ContextMenu.Item on:click={removeImage} class="text-destructive">
                                            <div class="flex items-center gap-2">
                                                <span>🗑️</span>
                                                Remove Image
                                            </div>
                                        </ContextMenu.Item>
                                    {/if}
                                    <ContextMenu.Separator />
                                    <ContextMenu.Item disabled class="text-xs">
                                        JPEG only • Max 256KB
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Root>
                            
                            <!-- Hidden file input -->
                            <input 
                                id="playlist-image"
                                type="file" 
                                accept="image/jpeg,image/jpg"
                                on:change={handleImageUpload}
                                class="hidden"
                            />
                        </div>
                    </div>
                    {#if form?.error}
                        <p class="text-destructive text-sm">{form.error}</p>
                    {/if}
                </CardContent>
            </Card>

            <!-- Step 2: Search Tracks -->
            <Card>
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            2
                        </div>
                        <div>
                            <CardTitle>Search Tracks</CardTitle>
                            <CardDescription>Find and add tracks to your playlist</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="space-y-4">
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
                    <div class="border rounded-lg overflow-hidden">
                        <div class="p-3 bg-muted/50 border-b">
                            <h4 class="font-medium text-sm">Search Results</h4>
                        </div>
                        <ScrollArea class="h-80">
                            <div class="divide-y">
                            {#if searching}
                                <div class="p-4 text-center text-muted-foreground text-sm">
                                    Searching...
                                </div>
                            {:else if searchResults.length === 0}
                                <div class="p-4 text-left text-muted-foreground text-sm">
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
                                            on:click={() => addTrack(track)}
                                            disabled={selectedTracks.find(t => t.id === track.id)}
                                            class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {selectedTracks.find(t => t.id === track.id) ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'} h-9 px-3 cursor-pointer"
                                        >
                                            {selectedTracks.find(t => t.id === track.id) ? 'Added' : 'Add'}
                                        </button>
                                    </div>
                                {/each}
                            {/if}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            <!-- Step 3: Review & Create -->
            <Card>
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            3
                        </div>
                        <div>
                            <CardTitle>Review & Create</CardTitle>
                            <CardDescription>Review your playlist and create it</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                            <div>
                                <div class="text-sm font-medium">Name</div>
                                <div class="text-sm text-muted-foreground">{name || 'Not set'}</div>
                            </div>
                            <div>
                                <div class="text-sm font-medium">Description</div>
                                <div class="text-sm text-muted-foreground">{description || 'None'}</div>
                            </div>
                            <div>
                                <div class="text-sm font-medium">Tracks</div>
                                <div class="text-sm text-muted-foreground">{selectedTracks.length} selected</div>
                            </div>
                        </div>

                        <form 
                            method="POST" 
                            action="?/create"
                            enctype="multipart/form-data"
                            use:enhance={({ formData }) => {
                                creating = true;
                                
                                // Add the image file to formData if it exists
                                if (playlistImage) {
                                    formData.append('playlist-image', playlistImage);
                                }
                                
                                return async ({ result, update }) => {
                                    if (result.type === 'redirect') {
                                        await update();
                                        return;
                                    }
                                    creating = false;
                                    await update();
                                };
                            }}
                        >
                            <input type="hidden" name="name" value={name}>
                            <input type="hidden" name="description" value={description}>
                            <input type="hidden" name="trackUris" value={JSON.stringify(selectedTracks.filter(t => t.uri && typeof t.uri === 'string').map(t => t.uri))}>

                            <Button 
                                type="submit" 
                                disabled={!canCreate || creating}
                                class="w-full"
                                size="lg"
                            >
                                {#if creating}
                                    Creating Playlist...
                                {:else}
                                    Create Playlist
                                {/if}
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Right Column: Selected Tracks -->
        <div class="lg:col-span-2 flex">
            <Card class="flex-1 flex flex-col">
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <div>
                            <CardTitle class="text-lg">Selected Tracks</CardTitle>
                            <CardDescription>{selectedTracks.length} tracks added</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent class="p-0 flex-1 overflow-hidden">
                    <div class="divide-y h-full overflow-y-auto">
                        {#if selectedTracks.length === 0}
                            <div class="h-full p-6">
                                <div class="space-y-3">
                                    <div class="text-base font-medium text-muted-foreground">No tracks added yet</div>
                                    <div class="space-y-2 text-sm text-muted-foreground">
                                        <p>Search and add tracks from the left panel to build your playlist</p>
                                        <p class="text-xs">💡 You can also create an empty playlist and add tracks later</p>
                                    </div>
                                </div>
                            </div>
                        {:else}
                            {#each selectedTracks as track, i}
                                <div 
                                    class="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors {dragOverIndex === i ? 'border-t-2 border-primary' : ''} {draggedTrackId === track.id ? 'opacity-50' : ''}"
                                    draggable="true"
                                    on:dragstart={(e) => handleDragStart(e, track.id)}
                                    on:dragover={(e) => handleDragOver(e, i)}
                                    on:dragleave={handleDragLeave}
                                    on:drop={(e) => handleDrop(e, i)}
                                    on:dragend={handleDragEnd}
                                >
                                    <div class="flex items-center gap-2">
                                        <div class="text-lg text-muted-foreground cursor-grab active:cursor-grabbing" title="Drag to reorder">
                                            ⋮⋮
                                        </div>
                                        <div class="text-sm text-muted-foreground w-4 text-center font-medium">
                                            {i + 1}
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedTracks.length}
                                            value={i + 1}
                                            on:blur={(e) => {
                                                const newPos = parseInt(e.target.value);
                                                if (newPos !== i + 1) {
                                                    moveTrackToPosition(track.id, newPos);
                                                }
                                            }}
                                            on:keydown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const newPos = parseInt(e.target.value);
                                                    if (newPos !== i + 1) {
                                                        moveTrackToPosition(track.id, newPos);
                                                    }
                                                    e.target.blur();
                                                }
                                            }}
                                            class="w-8 h-6 text-xs text-center border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                    </div>
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
                                    <button
                                        on:click={() => removeTrack(track.id)}
                                        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 text-destructive hover:text-destructive shrink-0 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            {/each}
                        {/if}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
</div>
