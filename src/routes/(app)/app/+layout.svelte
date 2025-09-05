<script lang="ts">
    import { Button } from "$lib/components/ui/button";

    async function handleLogout(e: MouseEvent) {
        e.preventDefault();
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
            <h1 class="text-xl font-semibold">DECENT</h1>
            <Button 
                on:click={handleLogout}
                variant="ghost"
                class="hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
                Logout
            </Button>
        </div>
    </header>

    <main class="my-10">
        <slot />
    </main>
</div>
