import { formatErrorResponse } from '@/lib/api-auth'
import { db, samfCircuits } from 'db/config'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
	try {
		let circuitsList = []

		if (db) {
			circuitsList = await db
				.select()
				.from(samfCircuits)
				.orderBy(samfCircuits.name)
		}

		return new Response(
			JSON.stringify({
				success: true,
				circuits: circuitsList,
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
