import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfCircuits } from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		// Only STAFF_INSPECTOR can audit circuits
		requireRole(locals, 'STAFF_INSPECTOR')

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { circuitId, inspectedAt, passed, observations, auditReportUrl } = body

		if (!circuitId || passed === undefined) {
			throw new ApiError(400, 'BAD_REQUEST', 'Faltan campos obligatorios (circuitId, passed).')
		}

		const dateInspected = inspectedAt ? new Date(inspectedAt) : new Date()

		// 1. Fetch circuit
		const circuitData = await db
			.select()
			.from(samfCircuits)
			.where(eq(samfCircuits.id, circuitId))
			.limit(1)

		if (circuitData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Circuito no encontrado.')
		}

		// 2. Update circuit audit details and status
		await db
			.update(samfCircuits)
			.set({
				lastAuditDate: dateInspected,
				status: passed ? 'APPROVED' : 'SUSPENDED',
			})
			.where(eq(samfCircuits.id, circuitId))

		return new Response(
			JSON.stringify({
				success: true,
				message: `Auditoría de circuito registrada con éxito. Estado: ${passed ? 'HOMOLOGADO' : 'SUSPENDIDO'}.`,
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
