import { ApiError, verifySession, formatErrorResponse } from '@/lib/api-auth'
import { getCharacterDetails } from '@/lib/fivem-db'
import { getUserRoles } from '@/lib/auth'
import { db, samfUsers } from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, locals, cookies }) => {
	try {
		const discordId = verifySession(locals)

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { citizenid } = body
		if (!citizenid) {
			throw new ApiError(400, 'BAD_REQUEST', 'El campo citizenid es obligatorio.')
		}

		// Fetch character details
		const character = await getCharacterDetails(citizenid)
		if (!character) {
			throw new ApiError(404, 'NOT_FOUND', 'Personaje no encontrado.')
		}

		// Verify character ownership
		const characterDiscordId = character.discord?.replace('discord:', '')
		if (characterDiscordId !== discordId) {
			throw new ApiError(
				403,
				'FORBIDDEN',
				'Este personaje no pertenece a tu cuenta de Discord.',
			)
		}

		// Sync character with SAMF database
		let userRole: 'PUBLIC' | 'STAFF_ADMIN' | 'STAFF_INSPECTOR' | 'STAFF_DISCIPLINA' | 'STAFF_DIRECTOR_GENERAL' | 'PILOTO' | 'DIRECTOR_ESCUDERIA' = 'PUBLIC'

		if (db) {
			const existingUsers = await db
				.select()
				.from(samfUsers)
				.where(eq(samfUsers.id, citizenid))
				.limit(1)

			if (existingUsers.length > 0) {
				userRole = existingUsers[0].role
			} else {
				// Check Discord roles to assign staff privileges
				const discordRoles = await getUserRoles(discordId)
				const isSuperAdmin = discordRoles.some(r => r.id === 'SUPERADMIN')
				const isStaffAdmin = discordRoles.some(r => r.id === 'STAFF_ADMIN')
				const isInspector = discordRoles.some(r => r.id === 'STAFF_INSPECTOR')
				const isDisciplina = discordRoles.some(r => r.id === 'STAFF_DISCIPLINA')
				const isDirGen = discordRoles.some(r => r.id === 'STAFF_DIRECTOR_GENERAL')

				if (isSuperAdmin || isStaffAdmin) {
					userRole = 'STAFF_ADMIN'
				} else if (isInspector) {
					userRole = 'STAFF_INSPECTOR'
				} else if (isDisciplina) {
					userRole = 'STAFF_DISCIPLINA'
				} else if (isDirGen) {
					userRole = 'STAFF_DIRECTOR_GENERAL'
				}

				await db.insert(samfUsers).values({
					id: citizenid,
					discordId: discordId,
					email: locals.user?.email ?? '',
					name: character.name,
					image: locals.user?.image ?? '',
					role: userRole,
				})
			}
		}

		// Set the samf_citizenid cookie securely
		cookies.set('samf_citizenid', citizenid, {
			path: '/',
			httpOnly: true,
			secure: import.meta.env.PROD,
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60, // 30 days
		})

		return new Response(
			JSON.stringify({
				success: true,
				citizenid,
				name: character.name,
				role: userRole,
				message: `Personaje ${character.name} seleccionado con éxito.`,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		)
	} catch (error) {
		return formatErrorResponse(error)
	}
}
