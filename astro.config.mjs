// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import vercel from '@astrojs/vercel'
import sitemap from '@astrojs/sitemap'
import auth from 'auth-astro'

// https://astro.build/config
export default defineConfig({
	prefetch: true,
	site: 'https://samf.lioncommunity.es',
	devToolbar: {
		enabled: false,
	},
	vite: {
		plugins: [tailwindcss()],
	},
	output: 'server',
	adapter: vercel(),
	integrations: [sitemap(), auth()],
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'Bebas Neue',
			cssVariable: '--font-bebas-neue',
		},
	],
})
