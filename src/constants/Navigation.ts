export const NAVIGATION_LINKS = [
	{
		label: 'Inicio',
		href: '/',
	},
	{
		label: 'La Federación',
		href: '/transparency',
		children: [
			{
				label: 'Transparencia y Cuentas',
				href: '/transparency',
			},
			{
				label: 'Escuderías Oficiales',
				href: '/teams',
			},
			{
				label: 'Pilotos Registrados',
				href: '/drivers',
			},
		],
	},
	{
		label: 'Competiciones',
		href: '/calendar',
		children: [
			{
				label: 'Calendario Oficial',
				href: '/calendar',
			},
			{
				label: 'Clasificaciones y Puntos',
				href: '/standings',
			},
		],
	},
	{
		label: 'Trámites',
		href: '/private/applications',
		children: [
			{
				label: 'Licencias y Permisos',
				href: '/private/applications',
			},
			{
				label: 'Homologación de Vehículos',
				href: '/private/vehicles',
			},
		],
	},
]
