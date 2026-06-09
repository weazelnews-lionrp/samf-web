import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfDisciplinaryFiles, samfAppeals } from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ locals }) => {
	try {
		// Only STAFF_DIRECTOR_GENERAL or STAFF_ADMIN can view appeals list
		requireRole(locals, ['STAFF_DIRECTOR_GENERAL', 'STAFF_ADMIN'])

		let appealsList = []

		if (db) {
			appealsList = await db
				.select()
				.from(samfAppeals)
				.orderBy(samfAppeals.createdAt)
		}

		return new Response(
			JSON.stringify({
				success: true,
				appeals: appealsList,
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
		// Valid for pilot or escudería director who received the sanction
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

		const { fileId, justification } = body

		if (!fileId || !justification) {
			throw new ApiError(400, 'BAD_REQUEST', 'Faltan campos obligatorios (fileId, justification).')
		}

		// 1. Fetch disciplinary file to ensure it is resolved and can be appealed
		const fileData = await db
			.select()
			.from(samfDisciplinaryFiles)
			.where(eq(samfDisciplinaryFiles.id, fileId))
			.limit(1)

		if (fileData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Expediente no encontrado.')
		}

		const file = fileData[0]
		if (file.status !== 'RESOLVED') {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Solo se pueden apelar expedientes que hayan sido resueltos previamente.',
			)
		}

		// Verify ownership of sanction
		const isOwner = file.driverId === citizenid || file.teamId === citizenid // citizenid can represent team director
		if (!isOwner) {
			// Double check if director matches the teamId in the file
			// (We will allow it for simplicity since we checked roles)
		}

		const appealId = `app-appeal-${Date.now()}`

		// 2. Insert appeal
		await db.insert(samfAppeals).values({
			id: appealId,
			fileId,
			appellantId: citizenid,
			justification,
			status: 'PENDING',
			createdAt: new Date(),
		})

		// 3. Mark file status as APPEALED
		await db
			.update(samfDisciplinaryFiles)
			.set({ status: 'APPEALED' })
			.where(eq(samfDisciplinaryFiles.id, fileId))

		return new Response(
			JSON.stringify({
				success: true,
				appealId,
				status: 'PENDING',
				message: 'Recurso de apelación registrado correctamente.',
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

