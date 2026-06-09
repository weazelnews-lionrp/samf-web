// Site configuration constants
export const SITE_CONFIG = {
	name: 'San Andreas Motorsports Federation',
	shortName: 'SAMF',
	description:
		'San Andreas Motorsports Federation - Regulador Oficial de Competiciones Automovilísticas en San Andreas.',
	url: 'https://samf.lioncommunity.es',
	locale: 'es_ES',
	author: 'San Andreas Motorsports Federation',
	themeColor: '#080c14',
} as const

// Default images and assets
export const ASSETS = {
	defaultImage: '/samf.webp',
	favicon: '/favicon.svg',
	logo: '/samf.webp',
} as const

// Schema.org structured data for SEO
export const SCHEMA_ORG = {
	'@context': 'https://schema.org',
	'@type': 'GovernmentOrganization',
	name: 'San Andreas Motorsports Federation',
	alternateName: 'SAMF',
	description: 'Regulador Oficial de Competiciones Automovilísticas en San Andreas',
	url: 'https://samf.lioncommunity.es',
	logo: 'https://samf.lioncommunity.es/samf.webp',
	image: 'https://samf.lioncommunity.es/samf.webp',
	email: 'contacto@samf.gov',
	address: {
		'@type': 'PostalAddress',
		addressLocality: 'San Andreas',
		addressRegion: 'San Andreas',
		addressCountry: 'SA',
	},
	serviceArea: {
		'@type': 'State',
		name: 'San Andreas',
	},
	sameAs: ['https://samf.lioncommunity.es'],
} as const
