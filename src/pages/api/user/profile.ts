import { verifyCharacter, formatErrorResponse } from '@/lib/api-auth'
import { db, samfDrivers, samfTeams } from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ locals }) => {
	try {
		const citizenid = verifyCharacter(locals)

		const userProfile = {
			id: citizenid,
			name: locals.user?.name ?? '',
			email: locals.user?.email ?? '',
			image: locals.user?.image ?? '',
			role: locals.user?.role ?? 'PUBLIC',
		}

		let associatedEntity = null

		if (db) {
			// If role is PILOTO, get their driver profile
			if (userProfile.role === 'PILOTO') {
				const driverData = await db
					.select()
					.from(samfDrivers)
					.where(eq(samfDrivers.id, citizenid))
					.limit(1)

				if (driverData.length > 0) {
					const driver = driverData[0]
					let teamName = ''

					if (driver.teamId) {
						const teamData = await db
							.select({ name: samfTeams.name })
							.from(samfTeams)
							.where(eq(samfTeams.id, driver.teamId))
							.limit(1)
						teamName = teamData[0]?.name ?? ''
					}

					associatedEntity = {
						type: 'driver',
						id: driver.id,
						teamId: driver.teamId,
						teamName,
						licenseStatus: driver.licenseStatus,
					}
				}
			}
			// If role is DIRECTOR_ESCUDERIA, get the team they direct
			else if (userProfile.role === 'DIRECTOR_ESCUDERIA') {
				const teamData = await db
					.select()
					.from(samfTeams)
					.where(eq(samfTeams.directorId, citizenid))
					.limit(1)

				if (teamData.length > 0) {
					const team = teamData[0]
					associatedEntity = {
						type: 'team',
						id: team.id,
						name: team.name,
						status: team.status,
					}
				}
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				user: userProfile,
				associatedEntity,
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
