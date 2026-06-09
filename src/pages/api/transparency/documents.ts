import { formatErrorResponse } from '@/lib/api-auth'
import { db, samfTransparencyDocs } from 'db/config'
import { desc } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
	try {
		let documentsList = []

		if (db) {
			documentsList = await db
				.select()
				.from(samfTransparencyDocs)
				.orderBy(desc(samfTransparencyDocs.publishedAt))
		}

		return new Response(
			JSON.stringify({
				success: true,
				documents: documentsList,
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
