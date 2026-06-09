import { formatErrorResponse } from '@/lib/api-auth'
import { db, samfDrivers, samfTeams } from 'db/config'
import { eq, like, and } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ url }) => {
	try {
		const searchParam = url.searchParams.get('search') ?? ''
		const teamParam = url.searchParams.get('teamId') ?? ''

		let driversList = []

		if (db) {
			let query = db
				.select({
					id: samfDrivers.id,
					name: samfDrivers.name,
					photo: samfDrivers.photo,
					nationality: samfDrivers.nationality,
					licenseStatus: samfDrivers.licenseStatus,
					isRookie: samfDrivers.isRookie,
					points: samfDrivers.points,
					teamId: samfDrivers.teamId,
					teamName: samfTeams.name,
				})
				.from(samfDrivers)
				.leftJoin(samfTeams, eq(samfDrivers.teamId, samfTeams.id))

			const conditions = []

			if (searchParam) {
				conditions.push(like(samfDrivers.name, `%${searchParam}%`))
			}

			if (teamParam) {
				conditions.push(eq(samfDrivers.teamId, teamParam))
			}

			if (conditions.length > 0) {
				driversList = await query.where(and(...conditions))
			} else {
				driversList = await query
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				drivers: driversList,
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
