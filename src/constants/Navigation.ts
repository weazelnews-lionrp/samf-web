export const NAVIGATION_LINKS = [
	{
		label: 'Inicio',
		href: '/',
	},
	{
		label: 'La Federación',
		href: '/about-us',
		children: [
			{
				label: 'Junta Directiva',
				href: '/board',
			},
			{
				label: 'Contacto',
				href: '/contact',
			},
		],
	},
	{
		label: 'Competiciones',
		href: '/championships',
		children: [
			{
				label: 'Liga de San Andreas',
				href: '/san-andreas-league',
			},
			{
				label: 'Rally Circuito',
				href: '/rally-circuito',
			},
			{
				label: 'Drift Championship',
				href: '/drift-championship',
			},
		],
	},
	{
		label: 'Normativa',
		href: '/rules',
		children: [
			{
				label: 'Documentos',
				href: '/docs',
			},
			{
				label: 'Legislación Aplicable',
				href: '/legislation',
			},
		],
	},
	{
		label: 'Servicios',
		href: '/services',
	},
	{
		label: 'Noticias',
		href: '/news',
	},
]
