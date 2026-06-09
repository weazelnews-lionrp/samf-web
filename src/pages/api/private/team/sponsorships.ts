import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfTeams, samfSponsorships } from 'db/config'
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

		const { companyName, taxId, declarationNoDebt } = body

		if (!companyName || !taxId) {
			throw new ApiError(400, 'BAD_REQUEST', 'Faltan campos obligatorios (companyName, taxId).')
		}

		if (!declarationNoDebt) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Debe declarar que la empresa no mantiene deudas tributarias con la administración pública.',
			)
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

		const sponsorId = `spons-${Date.now()}`

		await db.insert(samfSponsorships).values({
			id: sponsorId,
			teamId: team.id,
			companyName,
			taxId,
			declarationNoDebt: true,
			registeredAt: new Date(),
		})

		return new Response(
			JSON.stringify({
				success: true,
				sponsorId,
				message: 'Contrato de patrocinio registrado correctamente.',
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
