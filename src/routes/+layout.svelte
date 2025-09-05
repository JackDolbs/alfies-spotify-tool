<script lang="ts">
    import '../app.css';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import PocketBase from 'pocketbase';

    const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);

    onMount(() => {
        // Check if we're on an app route and not authenticated
        if (window.location.pathname.startsWith('/app') && !pb.authStore.isValid) {
            goto('/auth');
        }
    });
</script>

<slot />
