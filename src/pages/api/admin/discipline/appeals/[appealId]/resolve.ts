import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import {
	db,
	samfAppeals,
	samfDisciplinaryFiles,
	samfDrivers,
	samfTeams,
} from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ params, request, locals }) => {
	try {
		const { appealId } = params
		if (!appealId) {
			throw new ApiError(400, 'BAD_REQUEST', 'El parámetro appealId es obligatorio.')
		}

		// Only STAFF_DIRECTOR_GENERAL can resolve appeals
		const generalDirectorId = requireRole(locals, 'STAFF_DIRECTOR_GENERAL')

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { status, resolutionText } = body

		if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				"El estado es obligatorio y debe ser 'ACCEPTED' o 'REJECTED'.",
			)
		}

		if (!resolutionText) {
			throw new ApiError(400, 'BAD_REQUEST', 'El campo resolutionText es obligatorio.')
		}

		// 1. Fetch appeal details
		const appealData = await db
			.select()
			.from(samfAppeals)
			.where(eq(samfAppeals.id, appealId))
			.limit(1)

		if (appealData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Recurso de apelación no encontrado.')
		}

		const appeal = appealData[0]
		if (appeal.status !== 'PENDING') {
			throw new ApiError(400, 'BAD_REQUEST', 'Este recurso de apelación ya fue resuelto.')
		}

		// 2. Fetch the associated disciplinary file
		const fileData = await db
			.select()
			.from(samfDisciplinaryFiles)
			.where(eq(samfDisciplinaryFiles.id, appeal.fileId))
			.limit(1)

		if (fileData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Expediente sancionador asociado no encontrado.')
		}

		const file = fileData[0]

		let updatedFileStatus: 'OPEN' | 'RESOLVED' | 'APPEALED' | 'CLOSED' = 'CLOSED'

		// 3. If ACCEPTED, reverse the sanctions
		if (status === 'ACCEPTED') {
			// A. Reinstate docked points
			if (file.pointsDocked > 0) {
				if (file.driverId) {
					const drv = await db
						.select()
						.from(samfDrivers)
						.where(eq(samfDrivers.id, file.driverId))
						.limit(1)

					if (drv.length > 0) {
						await db
							.update(samfDrivers)
							.set({
								points: drv[0].points + file.pointsDocked,
								rookiePoints: drv[0].isRookie
									? drv[0].rookiePoints + file.pointsDocked
									: drv[0].rookiePoints,
							})
							.where(eq(samfDrivers.id, file.driverId))
					}
				}

				if (file.teamId) {
					const team = await db
						.select()
						.from(samfTeams)
						.where(eq(samfTeams.id, file.teamId))
						.limit(1)

					if (team.length > 0) {
						await db
							.update(samfTeams)
							.set({ points: team[0].points + file.pointsDocked })
							.where(eq(samfTeams.id, file.teamId))
					}
				}
			}

			// B. Restore driver license status to ACTIVE
			if (file.driverId && file.licenseSuspensionDays > 0) {
				await db
					.update(samfDrivers)
					.set({ licenseStatus: 'ACTIVE' })
					.where(eq(samfDrivers.id, file.driverId))
			}

			updatedFileStatus = 'RESOLVED' // Back to resolved but with comments
		}

		// 4. Update appeal resolution
		await db
			.update(samfAppeals)
			.set({
				status,
				resolutionText,
				generalDirectorId,
				resolvedAt: new Date(),
			})
			.where(eq(samfAppeals.id, appealId))

		// 5. Update disciplinary file status
		await db
			.update(samfDisciplinaryFiles)
			.set({
				status: updatedFileStatus,
				resolutionText: `Recurso de Apelación resuelto como ${status}. Comentarios: ${resolutionText}`,
			})
			.where(eq(samfDisciplinaryFiles.id, appeal.fileId))

		return new Response(
			JSON.stringify({
				success: true,
				message: `Recurso resuelto como ${status}. Sanciones revocadas/cerradas con éxito.`,
				updatedFileStatus,
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
