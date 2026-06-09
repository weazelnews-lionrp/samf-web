/// <reference path="../.astro/types.d.ts" />
declare namespace App {
	// Note: 'import {} from ""' syntax does not work in .d.ts files.
	interface Locals {
		user: (import('better-auth').User & { role?: string; discordId?: string }) | null
		session: import('better-auth').Session | null
		citizenid: string | null
		character: import('@/types/Users').FiveMPlayer | null
		roles: string[]
		perms: string[]
	}
}
