import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfTeams, samfDrivers } from 'db/config'
import { eq, inArray } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const PUT: APIRoute = async ({ request, locals }) => {
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

		const { driversList } = body
		if (!driversList || !Array.isArray(driversList)) {
			throw new ApiError(400, 'BAD_REQUEST', 'El campo driversList es obligatorio y debe ser un array.')
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

		// 2. Clear current driver relationships for this team
		await db
			.update(samfDrivers)
			.set({ teamId: null })
			.where(eq(samfDrivers.teamId, team.id))

		// 3. Set the new driver relationships
		if (driversList.length > 0) {
			const driverIds = driversList.map((d: any) => d.driverId).filter(Boolean)

			if (driverIds.length > 0) {
				// Resilient check/upsert: ensure all these driver records exist in samf_drivers
				for (const id of driverIds) {
					const existing = await db
						.select()
						.from(samfDrivers)
						.where(eq(samfDrivers.id, id))
						.limit(1)

					if (existing.length === 0) {
						// Create a default driver profile if they don't exist yet
						// The name will be fetched from user, or default
						await db.insert(samfDrivers).values({
							id,
							name: `Piloto ${id}`,
							licenseStatus: 'NONE',
							isRookie: true,
							points: 0,
							rookiePoints: 0,
						})
					}
				}

				// Update the drivers to join the team
				await db
					.update(samfDrivers)
					.set({ teamId: team.id })
					.where(inArray(samfDrivers.id, driverIds))
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Composición de la escudería actualizada exitosamente.',
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
