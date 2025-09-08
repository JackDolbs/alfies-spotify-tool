<!-- src/routes/(auth)/auth/+page.svelte -->
<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import type { SpotifyAccount } from "$lib/types/pocketbase-types";

    export let data: { accounts: SpotifyAccount[] };
    let newAccountName = "";

    function connectSpotify() {
        if (!newAccountName.trim()) {
            alert("Please enter a nickname for this Spotify account");
            return;
        }
        window.location.href = `/auth/api/spotify/login?accountName=${encodeURIComponent(newAccountName.trim())}`;
    }

    async function disconnectAccount(accountId: string) {
        try {
            const response = await fetch(`/auth/api/spotify/disconnect/${accountId}`, {
                method: 'POST'
            });
            if (response.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to disconnect account:', error);
            alert('Failed to disconnect account');
        }
    }
</script>

<div class="min-h-screen bg-background flex flex-col items-center justify-center">
    <div class="mb-10 text-center">
        <h1 class="text-2xl font-black tracking-tighter">DECENT</h1>
    </div>

    <Card class="w-full max-w-lg">
        <CardHeader>
            <CardTitle class="text-2xl font-bold text-left">Connect Spotify Account</CardTitle>
            <CardDescription class="text-left">
                {#if data.accounts.length === 0}
                    Connect your Spotify accounts to get started
                {:else}
                    Add another Spotify account to manage multiple playlists
                {/if}
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
            <!-- Connected Accounts -->
            {#if data.accounts.length > 0}
                <div class="space-y-4">
                    <h2 class="text-lg font-semibold">Connected Accounts</h2>
                    {#each data.accounts as account}
                        <div class="flex items-center justify-between p-4 rounded-lg border bg-card">
                            <div class="space-y-1">
                                <p class="font-medium">{account.account_name}</p>
                                <p class="text-sm text-muted-foreground">
                                    Connected {new Date(account.created).toLocaleDateString()}
                                </p>
                            </div>
                            <form on:submit|preventDefault={() => disconnectAccount(account.id)}>
                                <Button 
                                    variant="destructive"
                                    size="sm"
                                    type="submit"
                                >
                                    Disconnect
                                </Button>
                            </form>
                        </div>
                    {/each}
                </div>

                <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                        <span class="w-full border-t"></span>
                    </div>
                    <div class="relative flex justify-center text-xs uppercase">
                        <span class="bg-background px-2 text-muted-foreground">Connect Another Account</span>
                    </div>
                </div>
            {/if}

            <!-- Add New Account -->
            <div class="space-y-4 mt-5">
                <div class="space-y-2">
                    <Label for="accountName">
                        Give this account a nickname
                    </Label>
                    <Input 
                        id="accountName"
                        type="text"
                        bind:value={newAccountName}
                        placeholder="e.g., Personal, Work"
                    />
                </div>

                <form on:submit|preventDefault={connectSpotify}>
                    <Button 
                        class="w-full"
                        variant="default"
                        type="submit"
                        disabled={!newAccountName.trim()}
                    >
                        <svg
                            class="mr-2 h-4 w-4"
                            fill="currentColor"
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                            />
                        </svg>
                        Connect Spotify Account
                    </Button>
                </form>
            </div>
        </CardContent>
    </Card>
</div>

<style>
    :global(body) {
        background-color: hsl(var(--background));
    }
</style>