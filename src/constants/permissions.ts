const RoleCache: Record<string, string> = {}

const getDiscordRoleId = (role: string) => {
	if (RoleCache[role]) return RoleCache[role]
	const roles = JSON.parse(import.meta.env.ROLES_ID || '{}')
	RoleCache[role] = roles[role] || ''
	return RoleCache[role]
}

export const PERMISSIONS = {
	CREATE_NEWS: 'CREATE_NEWS',
	EDIT_NEWS: 'EDIT_NEWS',
	DELETE_NEWS: 'DELETE_NEWS',
	MANAGE_CACHE: 'MANAGE_CACHE',
	SUPERADMIN: 'SUPERADMIN',
} as const

export const ROLES = {
	SUPERADMIN: {
		discordId: getDiscordRoleId('SUPERADMIN'),
		label: 'Super Admin',
		permissions: [PERMISSIONS.SUPERADMIN],
	},
	STAFF_ADMIN: {
		discordId: getDiscordRoleId('STAFF_ADMIN'),
		label: 'Staff Admin',
		permissions: [PERMISSIONS.SUPERADMIN],
	},
	STAFF_INSPECTOR: {
		discordId: getDiscordRoleId('STAFF_INSPECTOR'),
		label: 'Staff Inspector',
		permissions: [],
	},
	STAFF_DISCIPLINA: {
		discordId: getDiscordRoleId('STAFF_DISCIPLINA'),
		label: 'Staff Disciplina',
		permissions: [],
	},
	STAFF_DIRECTOR_GENERAL: {
		discordId: getDiscordRoleId('STAFF_DIRECTOR_GENERAL'),
		label: 'Staff Director General',
		permissions: [PERMISSIONS.SUPERADMIN],
	},
} as const
