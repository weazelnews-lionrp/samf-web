import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfTransparencyDocs } from 'db/config'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		// Only STAFF_ADMIN can initialize seasons
		requireRole(locals, 'STAFF_ADMIN')

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { seasonYear, prizesAnnouncementUrl } = body

		if (!seasonYear || !prizesAnnouncementUrl) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Faltan campos obligatorios (seasonYear, prizesAnnouncementUrl).',
			)
		}

		// Insert into transparency documents as required by Art. 22.1
		const docId = `trans-doc-prizes-${seasonYear}`

		await db.insert(samfTransparencyDocs).values({
			id: docId,
			title: `Anuncio Oficial de Premios Económicos y Trofeos - Temporada ${seasonYear}`,
			description: `Cuadro íntegro de premios financieros reglamentado por la SAMF para la temporada ${seasonYear}.`,
			category: 'ANUNCIO_PREMIOS',
			fileUrl: prizesAnnouncementUrl,
			publishedAt: new Date(),
		})

		return new Response(
			JSON.stringify({
				success: true,
				message: `Temporada ${seasonYear} configurada y anuncio oficial de premios publicado correctamente.`,
			}),
			{
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			},
		)
	} catch (error) {
		return formatErrorResponse(error)
	}
}
