<script lang="ts">
    import '../app.css';
    import { onMount } from 'svelte';

    // Force dark mode immediately
    if (typeof document !== 'undefined') {
        document.documentElement.classList.add('dark');
    }

    onMount(() => {
        // Ensure dark mode is applied
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    });
</script>

<div class="dark min-h-screen bg-background text-foreground">
    <slot />
</div>
