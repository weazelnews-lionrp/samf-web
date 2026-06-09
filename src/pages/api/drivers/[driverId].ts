import { ApiError, formatErrorResponse } from '@/lib/api-auth'
import { db, samfDrivers, samfTeams, samfDriverStats } from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ params }) => {
	try {
		const { driverId } = params
		if (!driverId) {
			throw new ApiError(400, 'BAD_REQUEST', 'El parámetro driverId es obligatorio.')
		}

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		// Fetch driver and team details
		const driverData = await db
			.select({
				id: samfDrivers.id,
				name: samfDrivers.name,
				photo: samfDrivers.photo,
				nationality: samfDrivers.nationality,
				licenseStatus: samfDrivers.licenseStatus,
				licenseExpiry: samfDrivers.licenseExpiry,
				isRookie: samfDrivers.isRookie,
				points: samfDrivers.points,
				teamId: samfDrivers.teamId,
				teamName: samfTeams.name,
			})
			.from(samfDrivers)
			.leftJoin(samfTeams, eq(samfDrivers.teamId, samfTeams.id))
			.where(eq(samfDrivers.id, driverId))
			.limit(1)

		if (driverData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Piloto no encontrado.')
		}

		const driverRaw = driverData[0]

		// Fetch driver stats
		const statsData = await db
			.select()
			.from(samfDriverStats)
			.where(eq(samfDriverStats.driverId, driverId))
			.limit(1)

		const stats = statsData[0] ?? {
			poles: 0,
			fastestLaps: 0,
			wins: 0,
			podiums: 0,
			racesCompleted: 0,
		}

		return new Response(
			JSON.stringify({
				success: true,
				driver: {
					id: driverRaw.id,
					name: driverRaw.name,
					photo: driverRaw.photo,
					nationality: driverRaw.nationality,
					licenseStatus: driverRaw.licenseStatus,
					licenseExpiry: driverRaw.licenseExpiry,
					isRookie: driverRaw.isRookie,
					points: driverRaw.points,
					team: driverRaw.teamId
						? {
								id: driverRaw.teamId,
								name: driverRaw.teamName,
							}
						: null,
					stats: {
						poles: stats.poles,
						fastestLaps: stats.fastestLaps,
						wins: stats.wins,
						podiums: stats.podiums,
						racesCompleted: stats.racesCompleted,
					},
				},
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
