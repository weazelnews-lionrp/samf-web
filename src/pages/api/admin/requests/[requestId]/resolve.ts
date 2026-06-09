import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import {
	db,
	samfApplications,
	samfTeams,
	samfUsers,
	samfDrivers,
	samfDriverStats,
	samfVehicleCatalog,
	samfVehicleHomologation,
} from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ params, request, locals }) => {
	try {
		const { requestId } = params
		if (!requestId) {
			throw new ApiError(400, 'BAD_REQUEST', 'El parámetro requestId es obligatorio.')
		}

		// Only staff can resolve requests
		const reviewerId = requireRole(locals, ['STAFF_ADMIN', 'STAFF_INSPECTOR'])

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { status, rejectionReason } = body

		if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				"El estado es obligatorio y debe ser 'APPROVED' o 'REJECTED'.",
			)
		}

		if (status === 'REJECTED' && !rejectionReason) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Debe proporcionar un motivo de rechazo si deniega el trámite.',
			)
		}

		// 1. Fetch application
		const appData = await db
			.select()
			.from(samfApplications)
			.where(eq(samfApplications.id, requestId))
			.limit(1)

		if (appData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Solicitud no encontrada.')
		}

		const app = appData[0]
		if (app.status !== 'PENDING') {
			throw new ApiError(400, 'BAD_REQUEST', 'Esta solicitud ya ha sido resuelta previamente.')
		}

		const payload = JSON.parse(app.payload)

		// 2. Perform business logic depending on application type if APPROVED
		if (status === 'APPROVED') {
			const now = new Date()

			if (app.type === 'TEAM_REGISTRATION') {
				const teamId = `team-${payload.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`

				// Create team record
				await db.insert(samfTeams).values({
					id: teamId,
					name: payload.name,
					logo: payload.logoUrl,
					directorId: app.userId, // The applicant becomes director
					visualBadge: payload.visualBadge,
					status: 'ACTIVE',
					registeredAt: now,
					points: 0,
				})

				// Update user role to DIRECTOR_ESCUDERIA
				await db
					.update(samfUsers)
					.set({ role: 'DIRECTOR_ESCUDERIA' })
					.where(eq(samfUsers.id, app.userId))

				// Link initial drivers to the team
				if (payload.initialDrivers && Array.isArray(payload.initialDrivers)) {
					for (const driverId of payload.initialDrivers) {
						// Ensure pilot record exists
						const exists = await db
							.select()
							.from(samfDrivers)
							.where(eq(samfDrivers.id, driverId))
							.limit(1)

						if (exists.length === 0) {
							await db.insert(samfDrivers).values({
								id: driverId,
								name: `Piloto ${driverId}`,
								teamId,
								licenseStatus: 'NONE',
								isRookie: true,
								points: 0,
								rookiePoints: 0,
							})
						} else {
							await db
								.update(samfDrivers)
								.set({ teamId })
								.where(eq(samfDrivers.id, driverId))
						}
					}
				}
			} else if (app.type === 'DRIVER_LICENSE') {
				const oneYearLater = new Date()
				oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)

				// Ensure driver record exists or update it
				const exists = await db
					.select()
					.from(samfDrivers)
					.where(eq(samfDrivers.id, app.userId))
					.limit(1)

				if (exists.length === 0) {
					await db.insert(samfDrivers).values({
						id: app.userId,
						name: payload.fullName,
						teamId: payload.targetTeamId,
						licenseStatus: 'ACTIVE',
						licenseExpiry: oneYearLater,
						isRookie: true,
						points: 0,
						rookiePoints: 0,
					})
				} else {
					await db
						.update(samfDrivers)
						.set({
							licenseStatus: 'ACTIVE',
							licenseExpiry: oneYearLater,
							teamId: payload.targetTeamId,
							name: payload.fullName,
						})
						.where(eq(samfDrivers.id, app.userId))
				}

				// Ensure driver stats record exists
				const statsExists = await db
					.select()
					.from(samfDriverStats)
					.where(eq(samfDriverStats.driverId, app.userId))
					.limit(1)

				if (statsExists.length === 0) {
					await db.insert(samfDriverStats).values({
						driverId: app.userId,
						poles: 0,
						fastestLaps: 0,
						wins: 0,
						podiums: 0,
						racesCompleted: 0,
					})
				}

				// Update user role to PILOTO
				await db
					.update(samfUsers)
					.set({ role: 'PILOTO' })
					.where(eq(samfUsers.id, app.userId))
			} else if (app.type === 'CATALOG_INCLUSION') {
				const modelId = `model-${payload.brand.toLowerCase()}-${payload.model.toLowerCase().replace(/[^a-z0-9]/g, '-')}`

				await db.insert(samfVehicleCatalog).values({
					id: modelId,
					brand: payload.brand,
					model: payload.model,
					category: payload.category,
					approvedAt: now,
				})
			} else if (app.type === 'VEHICLE_HOMOLOGATION') {
				const oneYearLater = new Date()
				oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)

				// Find team if director
				const teamData = await db
					.select({ id: samfTeams.id })
					.from(samfTeams)
					.where(eq(samfTeams.directorId, app.userId))
					.limit(1)

				const teamId = teamData[0]?.id ?? null

				// Determine if applicant is driver
				const isDriver = await db
					.select()
					.from(samfDrivers)
					.where(eq(samfDrivers.id, app.userId))
					.limit(1)

				const driverId = isDriver.length > 0 ? app.userId : null

				await db.insert(samfVehicleHomologation).values({
					id: `hom-${payload.chassisNumber}`,
					modelId: payload.modelId,
					teamId,
					driverId,
					chassisNumber: payload.chassisNumber,
					rollCage: payload.safetyChecks.rollCage,
					fireExtinguisher: payload.safetyChecks.fireExtinguisher,
					harnessFourPoints: payload.safetyChecks.harnessFourPoints,
					certifiedSeat: payload.safetyChecks.certifiedSeat,
					controlECU: payload.safetyChecks.controlECU,
					tiresCategory: payload.safetyChecks.tiresCategory,
					approvedAt: now,
					expiresAt: oneYearLater,
					status: 'APPROVED',
				})
			}
		}

		// Update application status
		await db
			.update(samfApplications)
			.set({
				status,
				rejectionReason: status === 'REJECTED' ? rejectionReason : null,
				reviewerId,
				resolvedAt: new Date(),
			})
			.where(eq(samfApplications.id, requestId))

		return new Response(
			JSON.stringify({
				success: true,
				message: `Solicitud resuelta con éxito como ${status}.`,
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
