import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfApplications } from 'db/config'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		// Only Director de Escudería can request adding new vehicles to the catalog
		const citizenid = requireRole(locals, 'DIRECTOR_ESCUDERIA')

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { brand, model, category, technicalSpecs } = body

		if (!brand || !model || !category) {
			throw new ApiError(400, 'BAD_REQUEST', 'Faltan campos obligatorios (brand, model, category).')
		}

		const allowedCategories = ['SUPERDEPORTIVOS', 'PRO_STOCK', 'FORMULA', 'RALLY', 'GT']
		if (!allowedCategories.includes(category)) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				`Categoría no permitida. Debe ser una de: ${allowedCategories.join(', ')}`,
			)
		}

		const payload = {
			brand,
			model,
			category,
			technicalSpecs: technicalSpecs ?? '',
		}

		const applicationId = `app-cat-${Date.now()}`

		await db.insert(samfApplications).values({
			id: applicationId,
			type: 'CATALOG_INCLUSION',
			userId: citizenid,
			payload: JSON.stringify(payload),
			paymentProofUrl: null,
			status: 'PENDING',
			createdAt: new Date(),
		})

		return new Response(
			JSON.stringify({
				success: true,
				applicationId,
				status: 'PENDING',
				message: 'Solicitud de inclusión de vehículo en el catálogo recibida.',
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
