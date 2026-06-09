import { ApiError, formatErrorResponse } from '@/lib/api-auth'
import {
	db,
	samfTeams,
	samfUsers,
	samfDrivers,
	samfSponsorships,
	samfBulletins,
	samfRaceResults,
} from 'db/config'
import { eq, count, and } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ params }) => {
	try {
		const { teamId } = params
		if (!teamId) {
			throw new ApiError(400, 'BAD_REQUEST', 'El parámetro teamId es obligatorio.')
		}

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		// 1. Fetch team details with director info
		const teamData = await db
			.select({
				id: samfTeams.id,
				name: samfTeams.name,
				logo: samfTeams.logo,
				visualBadge: samfTeams.visualBadge,
				status: samfTeams.status,
				points: samfTeams.points,
				directorId: samfTeams.directorId,
				directorName: samfUsers.name,
			})
			.from(samfTeams)
			.leftJoin(samfUsers, eq(samfTeams.directorId, samfUsers.id))
			.where(eq(samfTeams.id, teamId))
			.limit(1)

		if (teamData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Escudería no encontrada.')
		}

		const teamRaw = teamData[0]

		// 2. Fetch sponsors
		const sponsorships = await db
			.select({ companyName: samfSponsorships.companyName })
			.from(samfSponsorships)
			.where(eq(samfSponsorships.teamId, teamId))

		const sponsorsList = sponsorships.map((s) => s.companyName)

		// 3. Fetch drivers
		const driversList = await db
			.select({
				id: samfDrivers.id,
				name: samfDrivers.name,
				photo: samfDrivers.photo,
				licenseStatus: samfDrivers.licenseStatus,
				isRookie: samfDrivers.isRookie,
			})
			.from(samfDrivers)
			.where(eq(samfDrivers.teamId, teamId))

		// 4. Fetch bulletins
		const bulletinsList = await db
			.select({
				id: samfBulletins.id,
				title: samfBulletins.title,
				content: samfBulletins.content,
				createdAt: samfBulletins.createdAt,
			})
			.from(samfBulletins)
			.where(eq(samfBulletins.teamId, teamId))
			.orderBy(samfBulletins.createdAt)

		// 5. Calculate palmares: count race wins (finishPosition = 1)
		const winsCount = await db
			.select({ value: count() })
			.from(samfRaceResults)
			.where(and(eq(samfRaceResults.teamId, teamId), eq(samfRaceResults.finishPosition, 1)))

		const wins = winsCount[0]?.value ?? 0

		return new Response(
			JSON.stringify({
				success: true,
				team: {
					id: teamRaw.id,
					name: teamRaw.name,
					logo: teamRaw.logo,
					director: {
						id: teamRaw.directorId,
						name: teamRaw.directorName,
					},
					visualBadge: teamRaw.visualBadge,
					status: teamRaw.status,
					points: teamRaw.points,
					sponsors: sponsorsList,
					drivers: driversList,
					bulletins: bulletinsList,
					palmares: {
						constructorsChampionships: 0, // This could be statically queried or hardcoded
						raceWins: wins,
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
