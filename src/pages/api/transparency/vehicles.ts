import { formatErrorResponse } from '@/lib/api-auth'
import { db, samfVehicleCatalog } from 'db/config'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
	try {
		let catalogList = []

		if (db) {
			catalogList = await db
				.select()
				.from(samfVehicleCatalog)
				.orderBy(samfVehicleCatalog.brand, samfVehicleCatalog.model)
		}

		return new Response(
			JSON.stringify({
				success: true,
				catalog: catalogList,
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
