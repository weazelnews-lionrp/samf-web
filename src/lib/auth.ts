import { extractUserId, fetchDiscordUser, getFivemUser } from './users'
import type {
	FiveMPlayer,
	FullAuthUser,
	Permission,
	Role,
	RoleId,
	UserSession,
	UserSessionWithDiscordId,
} from '@/types/Users'
import { PERMISSIONS, ROLES } from '@/constants/permissions'
// import { site } from 'astro:config/server'

import type { AstroGlobal } from 'astro'
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
	baseURL: import.meta.env.BETTER_AUTH_BASE_URL || 'https://www.lioncommunity.es',
	secret: import.meta.env.BETTER_AUTH_SECRET,
	trustedOrigins: ['https://lioncommunity.es', import.meta.env.BETTER_AUTH_BASE_URL].filter(
		Boolean,
	) as string[],
	advanced: {
		useSecureCookies: import.meta.env.PROD,
		defaultCookieAttributes: {
			sameSite: 'lax',
			secure: import.meta.env.PROD,
		},
	},
	user: {
		additionalFields: {
			discordId: {
				type: 'string',
				required: false,
				input: false,
			},
		},
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 400 * 24 * 60 * 60,
			strategy: 'jwe',
			refreshCache: true,
		},
	},
	account: {
		storeStateStrategy: 'cookie',
		storeAccountCookie: true,
	},
	socialProviders: {
		discord: {
			clientId: import.meta.env.DISCORD_CLIENT_ID,
			clientSecret: import.meta.env.DISCORD_CLIENT_SECRET,
			scope: ['identify', 'email'],
			mapProfileToUser: (profile) => ({
				discordId: profile.id,
				name: profile.global_name || profile.username,
				email: profile.email,
				image: profile.avatar
					? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
					: profile.image_url,
				emailVerified: profile.verified ?? false,
			}),
		},
	},
})

export const getSession = (astro: AstroGlobal): { user: UserSession } | null => {
	if (astro?.locals?.user) {
		return {
			user: {
				id: astro.locals.user.id,
				name: astro.locals.user.name,
				email: astro.locals.user.email,
				image: astro.locals.user.image as string,
				avatar: astro.locals.user.image as string,
			},
		}
	} else {
		return null
	}
}

export const getAuthUser = async (
	request: Request,
	fivem: boolean,
): Promise<{ discord: UserSession; fivem: FiveMPlayer | null } | null> => {
	const session = (await auth.api.getSession(request)) as { user: UserSessionWithDiscordId | null }
	if (!session?.user) return null

	let fivemUser = null

	session.user.id = session?.user?.discordId ?? session.user.id

	if (session?.user?.id && session?.user?.id?.length > 20) {
		session.user = {
			...session.user,
			id: extractUserId(session?.user?.image as string) ?? session.user.id,
		}
	}

	if (fivem && session?.user?.id) {
		fivemUser = await getFivemUser(session?.user?.id)
	}

	return {
		discord: session?.user ?? null,
		fivem: fivemUser,
	}
}

export const getFullUser = async (
	request: Request,
	fivem: boolean,
): Promise<FullAuthUser | null> => {
	const user = await getAuthUser(request, fivem)
	if (!user?.discord) return null

	let roles = await getUserRoles(user?.discord?.id)
	let perms = await getUserPerms(user?.discord?.id, roles)
	return {
		...user,
		perms,
		roles,
	}
}

export const getUserPerms = async (discordid?: string, roles?: Role[]): Promise<Permission[]> => {
	if (!discordid) return []

	const user = await fetchDiscordUser(discordid)
	if (!user) return []

	let perms: string[] = []

	if (!roles) {
		roles = await getUserRoles(discordid)
	}

	if (roles) {
		perms = roles.flatMap((role: Role) => ROLES[role.id as keyof typeof ROLES]?.permissions || [])
	}

	return perms as Permission[]
}

export const getUserRoles = async (discordid?: string): Promise<Role[]> => {
	if (!discordid) return []

	const user = await fetchDiscordUser(discordid)
	if (!user) return []

	return Object.entries(ROLES)
		.filter(([_, role]) => {
			return user?.roles?.includes(role.discordId)
		})
		.map(([id, role]) => ({ id: id, ...role }))
}

export const hasPerms = (
	perms: Permission[],
	requestedPerms: Permission | Permission[],
): boolean => {
	if (!perms || perms.length === 0) return false
	if (!requestedPerms || requestedPerms.length === 0) return true

	if (perms.includes(PERMISSIONS.SUPERADMIN)) return true

	const requested = Array.isArray(requestedPerms) ? requestedPerms : [requestedPerms]
	return requested.every((perm) => perms.includes(perm))
}

export const hasRole = (roles: Role[], requestedRoles: RoleId | RoleId[]): boolean => {
	if (!roles || roles.length === 0) return false
	if (!requestedRoles || requestedRoles.length === 0) return true

	const requested = Array.isArray(requestedRoles) ? requestedRoles : [requestedRoles]
	return requested.every((roleId) => roles.some((r) => r.id === roleId))
}
