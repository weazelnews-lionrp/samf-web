import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfDisciplinaryFiles } from 'db/config'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ locals }) => {
	try {
		// Only STAFF_DISCIPLINA or STAFF_ADMIN can view files
		requireRole(locals, ['STAFF_DISCIPLINA', 'STAFF_ADMIN'])

		let filesList = []

		if (db) {
			filesList = await db
				.select()
				.from(samfDisciplinaryFiles)
				.orderBy(samfDisciplinaryFiles.createdAt)
		}

		return new Response(
			JSON.stringify({
				success: true,
				files: filesList,
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

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		// Only STAFF_DISCIPLINA can open cases
		const committeeId = requireRole(locals, 'STAFF_DISCIPLINA')

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { driverId, teamId, severity, description } = body

		if (!severity || !description) {
			throw new ApiError(400, 'BAD_REQUEST', 'Faltan campos obligatorios (severity, description).')
		}

		const allowedSeverities = ['LEVE', 'GRAVE', 'MUY_GRAVE']
		if (!allowedSeverities.includes(severity)) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				`Gravedad no permitida. Debe ser una de: ${allowedSeverities.join(', ')}`,
			)
		}

		const fileId = `exp-${Date.now()}`

		await db.insert(samfDisciplinaryFiles).values({
			id: fileId,
			driverId: driverId || null,
			teamId: teamId || null,
			severity: severity as any,
			description,
			fineAmount: '0.00',
			pointsDocked: 0,
			licenseSuspensionDays: 0,
			status: 'OPEN',
			committeeId,
			createdAt: new Date(),
		})

		return new Response(
			JSON.stringify({
				success: true,
				fileId,
				status: 'OPEN',
				message: 'Expediente disciplinario abierto con éxito.',
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

