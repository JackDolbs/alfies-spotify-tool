import type { PageServerLoad } from './$types';
import { getConnectedAccounts } from '$lib/spotify/client';

export const load: PageServerLoad = async () => {
    const accounts = await getConnectedAccounts();
    return {
        accounts
    };
};