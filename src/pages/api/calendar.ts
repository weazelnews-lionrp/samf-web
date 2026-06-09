import { formatErrorResponse } from '@/lib/api-auth'
import { db, samfGrandPrixEvents, samfCircuits } from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
	try {
		let eventsList = []

		if (db) {
			eventsList = await db
				.select({
					id: samfGrandPrixEvents.id,
					season: samfGrandPrixEvents.season,
					name: samfGrandPrixEvents.name,
					circuit: {
						id: samfCircuits.id,
						name: samfCircuits.name,
						location: samfCircuits.location,
						length: samfCircuits.length,
						turnsCount: samfCircuits.turnsCount,
						mapUrl: samfCircuits.mapUrl,
					},
					startDate: samfGrandPrixEvents.startDate,
					endDate: samfGrandPrixEvents.endDate,
					status: samfGrandPrixEvents.status,
				})
				.from(samfGrandPrixEvents)
				.innerJoin(samfCircuits, eq(samfGrandPrixEvents.circuitId, samfCircuits.id))
				.orderBy(samfGrandPrixEvents.startDate)
		}

		return new Response(
			JSON.stringify({
				success: true,
				events: eventsList,
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
