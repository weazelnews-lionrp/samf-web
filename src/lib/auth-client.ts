import { createAuthClient } from 'better-auth/client'
// import { site } from 'astro:config/client'

export const authClient = createAuthClient({
	baseURL: import.meta.env.BETTER_AUTH_BASE_URL || window.location.origin || 'unset',
})
