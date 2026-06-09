import type {
	DiscordUser,
	SimpleDiscordUser,
	FiveMPlayer,
	CompleteFiveMUser,
	UserSession,
} from '@/types/Users'
import { eq, and, count as sqlCount } from 'drizzle-orm'
import { fivemDb, FiveMPlayers } from 'db/config.ts'
import { ROLES } from '@/constants/permissions'
import {
	getCachedUser,
	setCachedUser,
	getCachedAllMembers,
	setCachedAllMembers,
	getCachedStaffMembers,
	setCachedStaffMembers,
} from './discord-cache'
import type { Session } from 'better-auth'

const REQUEST_INTERVAL_MS = Number(import.meta.env.DISCORD_REQUEST_INTERVAL_MS) || 100

// Para control de rate limiting secuencial
let lastRequestTime = 0
const MIN_REQUEST_DELAY = 50 // Mínimo delay entre requests en ms

/**
 * Función helper para hacer una pausa si es necesario para evitar rate limiting
 */
async function waitForRateLimit(): Promise<void> {
	const now = Date.now()
	const timeSinceLastRequest = now - lastRequestTime
	if (timeSinceLastRequest < MIN_REQUEST_DELAY) {
		await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_DELAY - timeSinceLastRequest))
	}
	lastRequestTime = Date.now()
}

export async function fetchDiscordUser(discordId: string): Promise<DiscordUser | null> {
	// Intentar obtener del caché primero
	const cachedUser = getCachedUser(discordId)
	if (cachedUser !== undefined) {
		return cachedUser
	}

	const guild = import.meta.env.DISCORD_GUILD_ID
	const request = {
		url: `https://discord.com/api/v10/guilds/${guild}/members/${discordId}`,
		method: 'GET',
		headers: {
			['Content-Type']: 'application/json',
			['Authorization']: `Bot ${import.meta.env.DISCORD_BOT_TOKEN}`,
		},
	}

	const maxRetries = 3
	let attempt = 0

	while (attempt < maxRetries) {
		try {
			// Esperar si es necesario para evitar rate limiting
			await waitForRateLimit()

			const response = await fetch(request.url, request)

			// If rate limited, wait longer and retry
			if (response.status === 429) {
				const retryAfter = response.headers.get('Retry-After')
				const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : REQUEST_INTERVAL_MS
				console.warn(`Rate limited for Discord user ${discordId}, waiting ${waitTime}ms`)
				await new Promise((resolve) => setTimeout(resolve, waitTime))
				attempt++
				continue
			}

			const res = await response.json()

			// Check for Discord error code 10007 (Unknown Member)
			if (res.code === 10007) {
				// Usuario no existe en el servidor, cachear como null
				setCachedUser(discordId, null)
				return null
			}

			// For successful responses
			if (!res.code) {
				res.id = discordId
				const user = res
				setCachedUser(discordId, user)
				return user
			}

			// Otros errores de Discord
			console.error(`Discord API error for user ${discordId}:`, res)
			return null
		} catch (error) {
			console.error(`Network error fetching Discord user ${discordId}:`, error)
			attempt++
			if (attempt >= maxRetries) {
				return null
			}
			// Esperar un poco antes de reintentar en caso de error de red
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}
	}

	return null
}

/**
 * Obtiene múltiples usuarios de Discord de forma eficiente con rate limiting
 * Procesa las requests de forma secuencial para evitar rate limits
 */
export async function fetchMultipleDiscordUsers(
	discordIds: string[],
): Promise<Map<string, DiscordUser | null>> {
	const results = new Map<string, DiscordUser | null>()

	// Filtrar IDs duplicados y vacíos
	const uniqueIds = [...new Set(discordIds.filter((id) => id && id.trim() !== ''))]

	// Primero, intentar obtener del caché
	const uncachedIds: string[] = []
	for (const id of uniqueIds) {
		const cachedUser = getCachedUser(id)
		if (cachedUser !== undefined) {
			results.set(id, cachedUser)
		} else {
			uncachedIds.push(id)
		}
	}

	// Procesar los IDs no cacheados de forma secuencial para evitar rate limiting
	for (let i = 0; i < uncachedIds.length; i++) {
		const id = uncachedIds[i]
		const user = await fetchDiscordUser(id)
		results.set(id, user)
	}

	return results
}

export async function GetUserAndData({
	user,
}: {
	user: Session
}): Promise<DiscordUser | null | undefined> {
	return await fetchDiscordUser(user?.id || '')
}

export async function GetUserById(discordId: string): Promise<DiscordUser | null | undefined> {
	return await fetchDiscordUser(discordId || '')
}

export async function GetMultipleUsersById(discordIds: string[]): Promise<SimpleDiscordUser[]> {
	if (!discordIds || discordIds.length === 0) {
		console.log('❌ GetMultipleUsersById: No discordIds provided')
		return []
	}

	const users = await Promise.allSettled(
		discordIds.map(async (id) => {
			const user = await fetchDiscordUser(id)
			if (user) {
				const simpleUser = {
					id: user.id,
					username: user.user?.username || 'Usuario desconocido',
					global_name: user.user?.global_name || user.user?.username || '',
					avatar: user.user?.avatar || user.avatar || '',
					nick: user.nick || user.user?.global_name || user.user?.username || '',
					roles: user.roles || [],
				} as SimpleDiscordUser
				return simpleUser
			}
			return null
		}),
	)

	const finalUsers = users
		.filter(
			(result): result is PromiseFulfilledResult<SimpleDiscordUser> =>
				result.status === 'fulfilled' && result.value !== null,
		)
		.map((result) => result.value)

	return finalUsers
}

export function extractUserId(imageUrl: string): string {
	if (!imageUrl) return 'https://cdn.discordapp.com/avatars/0/0.png'
	const match = imageUrl.match(/avatars\/(\d+)\//)
	return match ? match[1] : ''
}

export async function getCompleteUserInformation(
	discord: {
		user: UserSession
	},
	pjNum: string | undefined | null = undefined,
): Promise<CompleteFiveMUser | null> {
	if (!discord || !discord.user || !discord.user.id || !fivemDb) return null

	const id = discord.user.id

	try {
		return {
			discord: (await fetchDiscordUser(id)) ?? discord.user,
			fivem: (await getFivemUser(id, pjNum)) as FiveMPlayer,
		}
	} catch (error) {
		console.error('Error getting complete user information:', error)
		return {
			discord: discord.user,
			fivem: null as unknown as FiveMPlayer,
		}
	}
}

export async function getFivemUser(
	discordId?: string,
	pjNum?: string | null,
): Promise<FiveMPlayer | null> {
	if (!fivemDb || !discordId) return null

	try {
		const users = await fivemDb
			.select()
			.from(FiveMPlayers)
			.where(and(eq(FiveMPlayers.discord, discordId), eq(FiveMPlayers.cid, Number(pjNum) || 1)))
			.limit(1)
		const user = users[0]
		if (!user) return null

		const count = await fivemDb
			.select({ count: sqlCount() })
			.from(FiveMPlayers)
			.where(eq(FiveMPlayers.discord, discordId))
			.then((res) => res[0]?.count || 0)

		return {
			...user,
			count,
		}
	} catch (error) {
		console.error('Error fetching FiveM user:', error)
		return null
	}
}

export function GetBadge(nick: string): string | null {
	const badge = nick.match('(\\s+)(?=\\[(.*?)\\]+$)')
	return badge ? badge[2] : null
}

export async function getAllMembers(limit?: number): Promise<SimpleDiscordUser[]> {
	// Intentar obtener del caché primero (solo si no hay límite específico)
	if (!limit) {
		const cachedMembers = getCachedAllMembers()
		if (cachedMembers) {
			return cachedMembers
		}
	}

	const guild = import.meta.env.DISCORD_GUILD_ID
	const allMembers: SimpleDiscordUser[] = []
	let after = '0' // Discord usa IDs como cursores para paginación
	const batchSize = 1000 // Máximo permitido por Discord API

	try {
		do {
			// Construir URL con parámetros de paginación
			const url = new URL(`https://discord.com/api/v10/guilds/${guild}/members`)
			url.searchParams.set('limit', batchSize.toString())
			url.searchParams.set('after', after)

			const response = await fetch(url.toString(), {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bot ${import.meta.env.DISCORD_BOT_TOKEN}`,
				},
			})

			if (!response.ok) {
				throw new Error(`Discord API error: ${response.status}`)
			}

			const members = await response.json()

			// Si no hay más miembros, salir del bucle
			if (!members || members.length === 0) {
				break
			}

			// Mapear y agregar miembros al array principal
			const mappedMembers = members.map((member: any) => ({
				id: member.user.id,
				username: member.user.username,
				global_name: member.user.global_name,
				avatar: member.user.avatar,
				nick: member.nick,
				roles: member.roles,
			}))

			allMembers.push(...mappedMembers)

			// Actualizar cursor para la siguiente petición
			// Discord ordena por ID, así que usamos el último ID como cursor
			after = members[members.length - 1].user.id

			// Si tenemos un límite específico y ya lo alcanzamos, parar
			if (limit && allMembers.length >= limit) {
				break
			}

			// Si obtuvimos menos del máximo, significa que no hay más páginas
			if (members.length < batchSize) {
				break
			}

			// Pequeña pausa para evitar rate limiting
			await new Promise((resolve) => setTimeout(resolve, 100))
		} while (true)

		// Aplicar límite si se especificó
		const finalMembers = limit ? allMembers.slice(0, limit) : allMembers

		// Ordenar por nick o global_name
		const sortedMembers = finalMembers.sort((a: SimpleDiscordUser, b: SimpleDiscordUser) => {
			const nameA = a.nick || a.global_name || a.username
			const nameB = b.nick || b.global_name || b.username
			return nameA.localeCompare(nameB)
		})

		// Guardar en caché solo si no hay límite específico
		if (!limit) {
			setCachedAllMembers(sortedMembers)
		}

		return sortedMembers
	} catch (error) {
		console.error('Error fetching all members:', error)
		return []
	}
}

export async function getAllStaffMembers(): Promise<SimpleDiscordUser[]> {
	// Intentar obtener del caché primero
	const cachedStaff = getCachedStaffMembers()
	if (cachedStaff) {
		return cachedStaff
	}

	try {
		const staffMembers = (await getAllMembers()).filter(
			(member: any) =>
				member.roles &&
				member.roles.some((roleId: string) => ROLES.FIVEM_STAFF.discordId === roleId),
		)

		// Guardar en caché
		setCachedStaffMembers(staffMembers)

		return staffMembers
	} catch (error) {
		console.error('Error fetching staff members:', error)
		return []
	}
}
