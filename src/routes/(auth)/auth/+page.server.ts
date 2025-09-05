import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import PocketBase from 'pocketbase';

export const load: PageServerLoad = async ({ locals }) => {
    // If already authenticated, redirect to app
    if (locals.admin) {
        throw redirect(303, '/app');
    }

    return {};
};

export const actions = {
    login: async ({ request, cookies }) => {
        const data = await request.formData();
        const email = data.get('email') as string;
        const password = data.get('password') as string;

        const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);

        try {
            const authData = await pb.admins.authWithPassword(email, password);
            
            // Set the auth cookie with the raw token
            cookies.set('pb_auth', JSON.stringify({
                token: pb.authStore.token,
                model: pb.authStore.model
            }), {
                httpOnly: false,
                secure: false,
                path: '/',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });

            return { success: true, admin: authData.admin };
        } catch (err) {
            console.error('Login failed:', err);
            return {
                success: false,
                error: 'Invalid credentials'
            };
        }
    }
} satisfies Actions;
