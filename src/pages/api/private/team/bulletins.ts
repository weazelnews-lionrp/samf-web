import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfTeams, samfBulletins } from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const citizenid = requireRole(locals, 'DIRECTOR_ESCUDERIA')

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { title, content } = body

		if (!title || !content) {
			throw new ApiError(400, 'BAD_REQUEST', 'Faltan campos obligatorios (title, content).')
		}

		// 1. Get the team directed by this user
		const teamData = await db
			.select()
			.from(samfTeams)
			.where(eq(samfTeams.directorId, citizenid))
			.limit(1)

		if (teamData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'No se encontró ninguna escudería asociada a este director.')
		}

		const team = teamData[0]

		const bulletinId = `bull-${Date.now()}`

		await db.insert(samfBulletins).values({
			id: bulletinId,
			teamId: team.id,
			title,
			content,
			authorId: citizenid,
			createdAt: new Date(),
			updatedAt: new Date(),
		})

		return new Response(
			JSON.stringify({
				success: true,
				bulletinId,
				message: 'Boletín de prensa publicado en el directorio público de la escudería.',
			}),
			{
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			},
		)
	} catch (error) {
		return formatErrorResponse(error)
	}
}
