import { ApiError, formatErrorResponse } from '@/lib/api-auth'
import { db, samfGrandPrixEvents, samfRaceResults, samfDrivers, samfTeams } from 'db/config'
import { eq, and } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ params }) => {
	try {
		const { raceId } = params
		if (!raceId) {
			throw new ApiError(400, 'BAD_REQUEST', 'El parámetro raceId es obligatorio.')
		}

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		// 1. Fetch Grand Prix Event details
		const gpData = await db
			.select()
			.from(samfGrandPrixEvents)
			.where(eq(samfGrandPrixEvents.id, raceId))
			.limit(1)

		if (gpData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Gran Premio no encontrado.')
		}

		const gp = gpData[0]

		// 2. Fetch all race results for this GP
		const resultsRaw = await db
			.select({
				driverId: samfRaceResults.driverId,
				driverName: samfDrivers.name,
				teamId: samfRaceResults.teamId,
				teamName: samfTeams.name,
				startPosition: samfRaceResults.startPosition,
				finishPosition: samfRaceResults.finishPosition,
				pointsAwarded: samfRaceResults.pointsAwarded,
				fastestLap: samfRaceResults.fastestLap,
				status: samfRaceResults.status,
			})
			.from(samfRaceResults)
			.innerJoin(samfDrivers, eq(samfRaceResults.driverId, samfDrivers.id))
			.innerJoin(samfTeams, eq(samfRaceResults.teamId, samfTeams.id))
			.where(eq(samfRaceResults.gpId, raceId))
			.orderBy(samfRaceResults.finishPosition)

		// 3. Find pole position
		const poleRow = resultsRaw.find((r) => r.startPosition === 1)
		const polePosition = poleRow
			? {
					driverId: poleRow.driverId,
					driverName: poleRow.driverName,
					teamName: poleRow.teamName,
				}
			: null

		// 4. Find fastest lap
		const fastestRow = resultsRaw.find((r) => r.fastestLap)
		const fastestLap = fastestRow
			? {
					driverId: fastestRow.driverId,
					driverName: fastestRow.driverName,
				}
			: null

		// 5. Format positions list
		const positions = resultsRaw
			.filter((r) => r.finishPosition !== null)
			.map((r) => ({
				position: r.finishPosition as number,
				driverId: r.driverId,
				driverName: r.driverName,
				teamName: r.teamName,
				pointsAwarded: r.pointsAwarded,
				status: r.status,
			}))

		return new Response(
			JSON.stringify({
				success: true,
				raceResults: {
					gpId: gp.id,
					gpName: gp.name,
					polePosition,
					fastestLap,
					positions,
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
