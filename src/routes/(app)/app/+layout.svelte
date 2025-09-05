<script lang="ts">
    async function handleLogout() {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST'
            });
            
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                // Fallback redirect
                window.location.href = '/auth';
            }
        } catch (err) {
            console.error('Logout failed:', err);
            // Fallback redirect
            window.location.href = '/auth';
        }
    }
</script>

<div class="min-h-screen bg-background">
    <header class="border-b">
        <div class="container mx-auto p-4 flex justify-between items-center">
            <h1 class="text-xl font-semibold">Spotify Playlist Manager</h1>
            <button 
                on:click={handleLogout}
                class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
            >
                Logout
            </button>
        </div>
    </header>

    <main class="my-10">
        <slot />
    </main>
</div>
