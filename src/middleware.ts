import { auth, getUserRoles } from '@/lib/auth'
import { getCharacterDetails } from '@/lib/fivem-db'
import { defineMiddleware } from 'astro:middleware'
import { db, samfUsers } from 'db/config'
import { eq } from 'drizzle-orm'

export const onRequest = defineMiddleware(async (context, next) => {
	// Initialize default local variables
	context.locals.user = null
	context.locals.session = null
	context.locals.citizenid = null
	context.locals.character = null
	context.locals.roles = []
	context.locals.perms = []

	const isAuthed = await auth.api.getSession({
		headers: context.request.headers,
	})

	if (isAuthed) {
		const discordId = isAuthed.user.discordId ?? isAuthed.user.id
		context.locals.session = isAuthed.session

		// Default user info based on Discord
		context.locals.user = {
			...isAuthed.user,
			id: discordId,
			discordId: discordId,
			role: 'PUBLIC',
		}

		// Read the character selection cookie
		const citizenid = context.cookies.get('samf_citizenid')?.value

		if (citizenid) {
			try {
				// Fetch character details from FiveM database
				const character = await getCharacterDetails(citizenid)

				// Verify that this character belongs to the logged-in Discord user
				// FiveM players table might store Discord identifier as 'discord:ID' or just 'ID'
				const characterDiscordId = character?.discord?.replace('discord:', '')

				if (character && characterDiscordId === discordId) {
					context.locals.citizenid = citizenid
					context.locals.character = character

					// Fetch or create user record in SAMF database
					let samfUser = null
					if (db) {
						const existingUsers = await db
							.select()
							.from(samfUsers)
							.where(eq(samfUsers.id, citizenid))
							.limit(1)

						if (existingUsers.length > 0) {
							samfUser = existingUsers[0]
						} else {
							// Determine initial role. If Discord user has staff roles, sync it
							let initialRole: 'PUBLIC' | 'STAFF_ADMIN' | 'STAFF_INSPECTOR' | 'STAFF_DISCIPLINA' | 'STAFF_DIRECTOR_GENERAL' | 'PILOTO' | 'DIRECTOR_ESCUDERIA' = 'PUBLIC'
							const discordRoles = await getUserRoles(discordId)

							// Map Discord roles to SAMF roles if applicable
							const isSuperAdmin = discordRoles.some(r => r.id === 'SUPERADMIN')
							const isStaffAdmin = discordRoles.some(r => r.id === 'STAFF_ADMIN')
							const isInspector = discordRoles.some(r => r.id === 'STAFF_INSPECTOR')
							const isDisciplina = discordRoles.some(r => r.id === 'STAFF_DISCIPLINA')
							const isDirGen = discordRoles.some(r => r.id === 'STAFF_DIRECTOR_GENERAL')

							if (isSuperAdmin || isStaffAdmin) {
								initialRole = 'STAFF_ADMIN'
							} else if (isInspector) {
								initialRole = 'STAFF_INSPECTOR'
							} else if (isDisciplina) {
								initialRole = 'STAFF_DISCIPLINA'
							} else if (isDirGen) {
								initialRole = 'STAFF_DIRECTOR_GENERAL'
							}

							const newUserData = {
								id: citizenid,
								discordId: discordId,
								email: isAuthed.user.email,
								name: character.name,
								image: isAuthed.user.image,
								role: initialRole,
							}

							await db.insert(samfUsers).values(newUserData)
							samfUser = newUserData
						}
					}

					// Update context locals with the character's SAMF role & metadata
					if (samfUser) {
						context.locals.user = {
							...context.locals.user,
							id: citizenid, // Primary ID is citizenid in SAMF
							name: samfUser.name,
							role: samfUser.role,
						}
						context.locals.roles = [samfUser.role]
						// In a full RBAC, we could add permissions mapped to the role
						context.locals.perms = [samfUser.role]
					}
				}
			} catch (error) {
				console.error('Error in middleware character parsing:', error)
			}
		}
	}

	return next()
})
