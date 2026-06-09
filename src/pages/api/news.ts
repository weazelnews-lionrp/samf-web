import { formatErrorResponse } from '@/lib/api-auth'
import { db, samfNews } from 'db/config'
import { desc } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
	try {
		let newsList = []

		if (db) {
			newsList = await db
				.select()
				.from(samfNews)
				.orderBy(desc(samfNews.createdAt))
		}

		return new Response(
			JSON.stringify({
				success: true,
				news: newsList,
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
