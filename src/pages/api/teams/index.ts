import { formatErrorResponse } from '@/lib/api-auth'
import { db, samfTeams, samfUsers } from 'db/config'
import { eq, like, and, or } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ url }) => {
	try {
		const statusParam = url.searchParams.get('status') as 'ACTIVE' | 'PENDING' | 'SUSPENDED' | null
		const searchParam = url.searchParams.get('search') ?? ''

		let teamsList = []

		if (db) {
			// Base query
			let query = db
				.select({
					id: samfTeams.id,
					name: samfTeams.name,
					logo: samfTeams.logo,
					visualBadge: samfTeams.visualBadge,
					directorName: samfUsers.name,
					status: samfTeams.status,
					points: samfTeams.points,
				})
				.from(samfTeams)
				.leftJoin(samfUsers, eq(samfTeams.directorId, samfUsers.id))

			// Build filters
			const conditions = []

			if (statusParam) {
				conditions.push(eq(samfTeams.status, statusParam))
			} else {
				// Default: show ACTIVE and SUSPENDED, exclude PENDING in public lists
				conditions.push(or(eq(samfTeams.status, 'ACTIVE'), eq(samfTeams.status, 'SUSPENDED')))
			}

			if (searchParam) {
				conditions.push(like(samfTeams.name, `%${searchParam}%`))
			}

			if (conditions.length > 0) {
				// Apply filters
				teamsList = await query.where(and(...conditions))
			} else {
				teamsList = await query
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				teams: teamsList,
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
