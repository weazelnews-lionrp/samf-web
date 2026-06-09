// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import vercel from '@astrojs/vercel'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
export default defineConfig({
	prefetch: true,
	site: import.meta.env.BETTER_AUTH_BASE_URL ?? 'https://samf.lioncommunity.es',
	devToolbar: {
		enabled: false,
	},
	vite: {
		plugins: [tailwindcss()],
	},
	output: 'server',
	adapter: vercel(),
	integrations: [sitemap()],
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'Montserrat',
			cssVariable: '--font-montserrat',
		},
	],
})
