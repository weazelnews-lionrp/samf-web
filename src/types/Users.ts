import type { ROLES } from '@/constants/permissions'

export interface UserSession {
	id: string
	name: string
	email: string
	image?: string
	avatar?: string
}

export interface UserSessionWithDiscordId extends UserSession {
	discordId: string
}

export interface DiscordUser {
	id: string
	avatar: string
	image: string
	communication_disabled_until: string | null
	flags: number
	joined_at: string
	nick: string
	pending: boolean
	premium_since: string | null
	roles: string[]
	unusual_dm_activity_until: string | null
	user: {
		id: string
		username: string
		avatar: string
		discriminator: string | null
		public_flags: number
		flags: number
		banner: string
		accent_color: number
		global_name: string
		avatar_decoration_data: {
			asset: string
			sku_id: string
		}
		banner_color: string
	}
	mute: boolean
	deaf: boolean
}

export interface SimpleDiscordUser {
	id: string
	username: string
	global_name: string
	avatar: string
	nick: string
	roles: string[]
}

export interface FiveMPlayer {
	count: number
	id: number
	cid: number
	discord: string
	license: string
	citizenid: string
	name: string
	money: any
	charinfo: any
	job: any
	metadata: any
	inventory?: any
	image?: string | null
}

export interface FiveMVehicle {
	id: number
	owner: string
	citizenid: string
	vehicle: string
	hash?: string
	mods?: any
	plate?: string
	garage?: string
	state?: number
	insurance?: string
	insurance_expiration?: Date | null
}

export interface FiveMHouse {
	id: number
	house: string
	identifier: string
	citizenid?: string
	keyholders?: any[]
}

export interface CompleteFiveMUser {
	discord: DiscordUser | UserSession
	fivem: FiveMPlayer
}

export type Permission = (typeof ROLES)[keyof typeof ROLES]['permissions'][number]
export type Role = (typeof ROLES)[keyof typeof ROLES] & { id: string }
export type RoleId = keyof typeof ROLES

export interface FullAuthUser {
	discord: UserSession
	fivem?: FiveMPlayer | null
	perms?: Permission[] | [] | null
	roles?: Role[] | [] | null
}
