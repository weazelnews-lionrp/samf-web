import type { SimpleDiscordUser, DiscordUser } from '@/types/Users'

/**
 * Sistema de caché para las peticiones a la API de Discord
 * El caché se mantiene en memoria durante 5 minutos
 */

interface CacheEntry<T> {
	data: T
	timestamp: number
}

interface DiscordCache {
	users: Map<string, CacheEntry<DiscordUser | null>>
}

// Tiempo de vida del caché en milisegundos (5 minutos)
const CACHE_TTL = 5 * 60 * 1000

// Almacenamiento del caché en memoria
const cache: DiscordCache = {
	users: new Map(),
}

/**
 * Verifica si una entrada de caché sigue siendo válida
 */
function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
	if (!entry) return false
	const now = Date.now()
	return now - entry.timestamp < CACHE_TTL
}

/**
 * Obtiene un usuario específico del caché si está disponible y válido
 */
export function getCachedUser(discordId: string): DiscordUser | null | undefined {
	const entry = cache.users.get(discordId)
	if (isCacheValid(entry || null)) {
		return entry!.data
	}
	return undefined
}

/**
 * Guarda un usuario específico en el caché
 */
export function setCachedUser(discordId: string, user: DiscordUser | null): void {
	cache.users.set(discordId, {
		data: user,
		timestamp: Date.now(),
	})
}

/**
 * Purga todo el caché de Discord
 * Esta función está disponible para que la implementes según tus necesidades
 */
export function purgeDiscordCache(): void {
	cache.users.clear()
}

/**
 * Purga el caché de un usuario específico
 */
export function purgeUserCache(discordId: string): void {
	cache.users.delete(discordId)
}

/**
 * Obtiene información sobre el estado del caché
 */
export function getCacheStats() {
	return {
		users: {
			count: cache.users.size,
			validCount: Array.from(cache.users.values()).filter((entry) => isCacheValid(entry)).length,
		},
		ttl: CACHE_TTL,
	}
}
