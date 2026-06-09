import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import {
	db,
	samfGrandPrixEvents,
	samfRaceResults,
	samfDrivers,
	samfTeams,
	samfDriverStats,
} from 'db/config'
import { eq, and } from 'drizzle-orm'
import type { APIRoute } from 'astro'

const POINT_SYSTEM: Record<number, number> = {
	1: 25,
	2: 18,
	3: 15,
	4: 12,
	5: 10,
	6: 8,
	7: 6,
	8: 4,
	9: 2,
	10: 1,
}

export const POST: APIRoute = async ({ params, request, locals }) => {
	try {
		const { raceId } = params
		if (!raceId) {
			throw new ApiError(400, 'BAD_REQUEST', 'El parámetro raceId es obligatorio.')
		}

		// Only STAFF_ADMIN can publish race results
		requireRole(locals, 'STAFF_ADMIN')

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { polePositionDriverId, fastestLapDriverId, results } = body

		if (!polePositionDriverId || !fastestLapDriverId || !results || !Array.isArray(results)) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Faltan campos obligatorios (polePositionDriverId, fastestLapDriverId, results).',
			)
		}

		// 1. Fetch GP details and verify it exists and is not already completed
		const gpData = await db
			.select()
			.from(samfGrandPrixEvents)
			.where(eq(samfGrandPrixEvents.id, raceId))
			.limit(1)

		if (gpData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Gran Premio no encontrado.')
		}

		const gp = gpData[0]
		if (gp.status === 'COMPLETED') {
			throw new ApiError(400, 'BAD_REQUEST', 'Los resultados de esta carrera ya fueron publicados.')
		}

		const pointsDistributed: Record<string, number> = {}

		// 2. Process results
		for (const res of results) {
			const { position, driverId, status } = res
			if (!driverId || !position) continue

			// Fetch driver details to get their team and rookie status
			const driverData = await db
				.select()
				.from(samfDrivers)
				.where(eq(samfDrivers.id, driverId))
				.limit(1)

			if (driverData.length === 0) continue
			const driver = driverData[0]

			// Calculate points
			let basePoints = status === 'FINISHED' ? (POINT_SYSTEM[position] ?? 0) : 0
			const isFastest = driverId === fastestLapDriverId
			const fastestLapPoints = isFastest && basePoints > 0 ? 1 : 0 // +1 pt if fastest lap and finished in top 10 (has basePoints)
			const totalPoints = basePoints + fastestLapPoints

			pointsDistributed[driverId] = totalPoints

			const resultId = `res-${raceId}-${driverId}`

			// Save race result
			await db.insert(samfRaceResults).values({
				id: resultId,
				gpId: raceId,
				driverId,
				teamId: driver.teamId ?? 'unaffiliated',
				startPosition: driverId === polePositionDriverId ? 1 : 10, // Mock start position
				finishPosition: status === 'FINISHED' ? position : null,
				pointsAwarded: totalPoints,
				fastestLap: isFastest,
				status: status as any,
			})

			// Update driver points
			await db
				.update(samfDrivers)
				.set({
					points: driver.points + totalPoints,
					rookiePoints: driver.isRookie ? driver.rookiePoints + totalPoints : driver.rookiePoints,
				})
				.where(eq(samfDrivers.id, driverId))

			// Update team points
			if (driver.teamId) {
				const teamData = await db
					.select()
					.from(samfTeams)
					.where(eq(samfTeams.id, driver.teamId))
					.limit(1)

				if (teamData.length > 0) {
					const team = teamData[0]
					await db
						.update(samfTeams)
						.set({
							points: team.points + totalPoints,
						})
						.where(eq(samfTeams.id, driver.teamId))
				}
			}

			// Update driver career stats
			const statsData = await db
				.select()
				.from(samfDriverStats)
				.where(eq(samfDriverStats.driverId, driverId))
				.limit(1)

			if (statsData.length > 0) {
				const stats = statsData[0]
				await db
					.update(samfDriverStats)
					.set({
						poles: driverId === polePositionDriverId ? stats.poles + 1 : stats.poles,
						fastestLaps: isFastest ? stats.fastestLaps + 1 : stats.fastestLaps,
						wins: position === 1 && status === 'FINISHED' ? stats.wins + 1 : stats.wins,
						podiums:
							position <= 3 && status === 'FINISHED' ? stats.podiums + 1 : stats.podiums,
						racesCompleted: status === 'FINISHED' ? stats.racesCompleted + 1 : stats.racesCompleted,
					})
					.where(eq(samfDriverStats.driverId, driverId))
			} else {
				await db.insert(samfDriverStats).values({
					driverId,
					poles: driverId === polePositionDriverId ? 1 : 0,
					fastestLaps: isFastest ? 1 : 0,
					wins: position === 1 && status === 'FINISHED' ? 1 : 0,
					podiums: position <= 3 && status === 'FINISHED' ? 1 : 0,
					racesCompleted: status === 'FINISHED' ? 1 : 0,
				})
			}
		}

		// 3. Mark GP event as completed
		await db
			.update(samfGrandPrixEvents)
			.set({ status: 'COMPLETED' })
			.where(eq(samfGrandPrixEvents.id, raceId))

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Resultados publicados. Clasificaciones actualizadas.',
				pointsDistributed,
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
