import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfApplications } from 'db/config'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		// Valid for both PILOTO and DIRECTOR_ESCUDERIA roles
		const citizenid = requireRole(locals, ['PILOTO', 'DIRECTOR_ESCUDERIA'])

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { modelId, chassisNumber, safetyChecks } = body

		if (!modelId || !chassisNumber || !safetyChecks) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Faltan campos obligatorios (modelId, chassisNumber, safetyChecks).',
			)
		}

		const {
			rollCage,
			fireExtinguisher,
			harnessFourPoints,
			certifiedSeat,
			controlECU,
			tiresCategory,
		} = safetyChecks

		if (
			rollCage === undefined ||
			fireExtinguisher === undefined ||
			harnessFourPoints === undefined ||
			certifiedSeat === undefined ||
			controlECU === undefined ||
			!tiresCategory
		) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Debe completar todos los checklist de seguridad técnica.',
			)
		}

		const payload = {
			modelId,
			chassisNumber,
			safetyChecks: {
				rollCage: !!rollCage,
				fireExtinguisher: !!fireExtinguisher,
				harnessFourPoints: !!harnessFourPoints,
				certifiedSeat: !!certifiedSeat,
				controlECU: !!controlECU,
				tiresCategory,
			},
		}

		const applicationId = `app-hom-${Date.now()}`

		await db.insert(samfApplications).values({
			id: applicationId,
			type: 'VEHICLE_HOMOLOGATION',
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
				message:
					'Trámite de homologación creado. Un Inspector Técnico revisará el vehículo físicamente.',
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
