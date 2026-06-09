import { formatErrorResponse } from '@/lib/api-auth'
import { db, samfDrivers, samfTeams } from 'db/config'
import { eq, desc } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
	try {
		let driversStandings: any[] = []
		let constructorsStandings: any[] = []
		let rookieStandings: any[] = []

		if (db) {
			// 1. Fetch Drivers Standings
			const driversData = await db
				.select({
					driverId: samfDrivers.id,
					driverName: samfDrivers.name,
					teamName: samfTeams.name,
					points: samfDrivers.points,
				})
				.from(samfDrivers)
				.leftJoin(samfTeams, eq(samfDrivers.teamId, samfTeams.id))
				.orderBy(desc(samfDrivers.points))

			driversStandings = driversData.map((d, index) => ({
				position: index + 1,
				driverId: d.driverId,
				driverName: d.driverName,
				teamName: d.teamName ?? 'Sin Escudería',
				points: d.points,
			}))

			// 2. Fetch Constructors Standings
			const teamsData = await db
				.select({
					teamId: samfTeams.id,
					teamName: samfTeams.name,
					points: samfTeams.points,
				})
				.from(samfTeams)
				.where(eq(samfTeams.status, 'ACTIVE'))
				.orderBy(desc(samfTeams.points))

			constructorsStandings = teamsData.map((t, index) => ({
				position: index + 1,
				teamId: t.teamId,
				teamName: t.teamName,
				points: t.points,
			}))

			// 3. Fetch Rookie Standings
			const rookiesData = await db
				.select({
					driverId: samfDrivers.id,
					driverName: samfDrivers.name,
					points: samfDrivers.rookiePoints,
				})
				.from(samfDrivers)
				.where(eq(samfDrivers.isRookie, true))
				.orderBy(desc(samfDrivers.rookiePoints))

			rookieStandings = rookiesData.map((r, index) => ({
				position: index + 1,
				driverId: r.driverId,
				driverName: r.driverName,
				points: r.points,
			}))
		}

		return new Response(
			JSON.stringify({
				success: true,
				driversStandings,
				constructorsStandings,
				rookieStandings,
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
