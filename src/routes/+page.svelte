<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import PocketBase from 'pocketbase';

    onMount(() => {
        const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
        
        // Redirect based on auth status
        if (pb.authStore.isValid) {
            goto('/app');
        } else {
            goto('/auth');
        }
    });
</script>

<div class="flex min-h-screen items-center justify-center">
    <div class="animate-pulse">Loading...</div>
</div>
