<script lang="ts">
    import { enhance } from "$app/forms";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import type { ActionData } from './$types';

    export let form: ActionData;

    let creating = false;
    let name = '';
    let description = '';

    function resetForm() {
        name = '';
        description = '';
        creating = false;
    }
</script>

<div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Create New Playlist</h1>
        <Button variant="outline" href="/app">Back to Playlists</Button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Left side: Playlist Details -->
        <div class="space-y-4">
            <h2 class="text-xl font-semibold">Playlist Details</h2>
            <form 
                method="POST" 
                action="?/create"
                use:enhance={() => {
                    creating = true;
                    return async ({ result, update }) => {
                        if (result.type === 'redirect') {
                            // Let the redirect happen
                            await update();
                            return;
                        }
                        // Only reset creating state if there was an error
                        creating = false;
                        await update();
                    };
                }}
                class="space-y-4"
            >
                <div class="space-y-2">
                    <label for="name" class="text-sm font-medium">
                        Playlist Name
                    </label>
                    <Input 
                        id="name"
                        name="name" 
                        type="text" 
                        bind:value={name}
                        placeholder="My Awesome Playlist"
                        required
                    />
                </div>

                <div class="space-y-2">
                    <label for="description" class="text-sm font-medium">
                        Description (optional)
                    </label>
                    <Input 
                        id="description"
                        name="description" 
                        type="text" 
                        bind:value={description}
                        placeholder="What's this playlist about?"
                    />
                </div>

                {#if form?.error}
                    <p class="text-destructive text-sm">{form.error}</p>
                {/if}

                <Button type="submit" class="w-full" disabled={creating}>
                    {#if creating}
                        Creating...
                    {:else}
                        Create Playlist
                    {/if}
                </Button>
            </form>
        </div>

        <!-- Right side: Track Search (to be implemented) -->
        <div class="space-y-4">
            <h2 class="text-xl font-semibold">Search Tracks</h2>
            <div class="space-y-2">
                <Input type="search" placeholder="Search for tracks..." disabled />
                <div class="min-h-[200px] border rounded-md p-4">
                    <p class="text-muted-foreground text-center">
                        Track search will be available after creating the playlist
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
