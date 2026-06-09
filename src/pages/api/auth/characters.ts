import { verifySession, formatErrorResponse } from '@/lib/api-auth'
import { getCharactersByDiscord } from '@/lib/fivem-db'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ locals }) => {
	try {
		const discordId = verifySession(locals)
		const characters = await getCharactersByDiscord(discordId)

		return new Response(
			JSON.stringify({
				success: true,
				characters,
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
