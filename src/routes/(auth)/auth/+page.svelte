<script lang="ts">
    import { Button } from "$lib/components/ui/button";
</script>

<div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-md space-y-8 p-8">
        <div class="text-center">
            <h1 class="text-xl font-bold">DECENT</h1>
            <p class="mt-2 text-gray-600">Connect your Spotify account to get started</p>
        </div>

        <div class="mt-8 space-y-4">
            <Button 
                href="/auth/api/spotify/login"
                class="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white flex items-center justify-center gap-2"
                size="lg"
            >
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.371-.721.49-1.101.24-3.021-1.851-6.832-2.271-11.312-1.241-.418.07-.832-.211-.901-.63-.071-.418.211-.832.63-.901 4.921-1.121 9.142-.601 12.452 1.441.39.241.48.721.241 1.101zm1.471-3.271c-.301.461-.921.6-1.381.301-3.461-2.131-8.722-2.741-12.842-1.501-.491.151-1.021-.13-1.171-.621-.15-.491.131-1.021.621-1.171 4.681-1.421 10.522-.721 14.452 1.771.448.272.592.901.301 1.352zm.127-3.401c-4.151-2.461-11.002-2.691-14.962-1.491-.631.181-1.291-.181-1.471-.811-.181-.631.181-1.291.811-1.471 4.561-1.381 12.152-1.111 16.952 1.721.571.341.761 1.081.421 1.661-.341.561-1.081.751-1.661.41z"/>
                </svg>
                Connect with Spotify
            </Button>
        </div>
    </div>
</div>
