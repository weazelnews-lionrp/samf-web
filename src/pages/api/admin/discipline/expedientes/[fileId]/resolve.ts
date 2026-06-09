import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import {
	db,
	samfDisciplinaryFiles,
	samfDrivers,
	samfTeams,
} from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ params, request, locals }) => {
	try {
		const { fileId } = params
		if (!fileId) {
			throw new ApiError(400, 'BAD_REQUEST', 'El parámetro fileId es obligatorio.')
		}

		// Only STAFF_DISCIPLINA can resolve files
		requireRole(locals, 'STAFF_DISCIPLINA')

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { resolutionText, fineAmount, pointsDocked, licenseSuspensionDays } = body

		if (!resolutionText) {
			throw new ApiError(400, 'BAD_REQUEST', 'El campo resolutionText es obligatorio.')
		}

		// 1. Fetch disciplinary file
		const fileData = await db
			.select()
			.from(samfDisciplinaryFiles)
			.where(eq(samfDisciplinaryFiles.id, fileId))
			.limit(1)

		if (fileData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Expediente no encontrado.')
		}

		const file = fileData[0]
		if (file.status !== 'OPEN') {
			throw new ApiError(400, 'BAD_REQUEST', 'Este expediente ya ha sido resuelto o cerrado.')
		}

		const fineVal = Number(fineAmount) || 0
		const ptsDocked = Number(pointsDocked) || 0
		const suspDays = Number(licenseSuspensionDays) || 0

		// 2. Apply points docking if applicable
		if (ptsDocked > 0) {
			if (file.driverId) {
				const drv = await db
					.select()
					.from(samfDrivers)
					.where(eq(samfDrivers.id, file.driverId))
					.limit(1)

				if (drv.length > 0) {
					const newPts = Math.max(0, drv[0].points - ptsDocked)
					const newRookiePts = Math.max(0, drv[0].rookiePoints - ptsDocked)
					await db
						.update(samfDrivers)
						.set({ points: newPts, rookiePoints: newRookiePts })
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
					const newPts = Math.max(0, team[0].points - ptsDocked)
					await db
						.update(samfTeams)
						.set({ points: newPts })
						.where(eq(samfTeams.id, file.teamId))
				}
			}
		}

		// 3. Apply license suspension if applicable
		let newLicenseStatus: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'NONE' = 'ACTIVE'
		if (suspDays > 0 && file.driverId) {
			await db
				.update(samfDrivers)
				.set({ licenseStatus: 'SUSPENDED' })
				.where(eq(samfDrivers.id, file.driverId))

			newLicenseStatus = 'SUSPENDED'
		}

		// 4. Update file status
		await db
			.update(samfDisciplinaryFiles)
			.set({
				status: 'RESOLVED',
				resolutionText,
				fineAmount: fineVal.toFixed(2),
				pointsDocked: ptsDocked,
				licenseSuspensionDays: suspDays,
				resolvedAt: new Date(),
			})
			.where(eq(samfDisciplinaryFiles.id, fileId))

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Expediente resuelto con éxito.',
				newLicenseStatus,
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
