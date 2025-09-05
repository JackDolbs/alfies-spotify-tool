<script lang="ts">
    import '../app.css';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import PocketBase from 'pocketbase';

    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);

    // Force dark mode immediately
    if (typeof document !== 'undefined') {
        document.documentElement.classList.add('dark');
    }

    onMount(() => {
        // Ensure dark mode is applied
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        
        // Check if we're on an app route and not authenticated
        if (window.location.pathname.startsWith('/app') && !pb.authStore.isValid) {
            goto('/auth');
        }
    });
</script>

<div class="dark min-h-screen bg-background text-foreground">
    <slot />
</div>
