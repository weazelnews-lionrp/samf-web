import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import {
	db,
	samfSubstanceControls,
	samfDrivers,
	samfDisciplinaryFiles,
} from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		// Only STAFF_INSPECTOR can register tests
		const inspectorId = requireRole(locals, 'STAFF_INSPECTOR')

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let body
		try {
			body = await request.json()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un JSON válido.')
		}

		const { gpId, driverId, testType, alcoholLevel, drugsResult } = body

		if (!gpId || !driverId || !testType || alcoholLevel === undefined || !drugsResult) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Faltan campos obligatorios (gpId, driverId, testType, alcoholLevel, drugsResult).',
			)
		}

		const alcValue = Number(alcoholLevel)
		const isPositive = drugsResult === 'POSITIVE' || alcValue > 0.0

		// Fetch driver to ensure they exist and get team context
		const driverData = await db
			.select()
			.from(samfDrivers)
			.where(eq(samfDrivers.id, driverId))
			.limit(1)

		if (driverData.length === 0) {
			throw new ApiError(404, 'NOT_FOUND', 'Piloto no encontrado.')
		}

		const driver = driverData[0]

		// 1. Insert control entry
		const controlId = `sc-${Date.now()}`
		await db.insert(samfSubstanceControls).values({
			id: controlId,
			gpId,
			driverId,
			testType,
			alcoholLevel: alcValue.toFixed(2),
			drugsResult,
			inspectorId,
			registeredAt: new Date(),
			notified: true, // Mark notified as true since they will get it dynamically in their inbox
		})

		let disciplinaryFileCreated = false

		// 2. Perform automatic triggers if positive
		if (isPositive) {
			// A. Suspend license immediately
			await db
				.update(samfDrivers)
				.set({ licenseStatus: 'SUSPENDED' })
				.where(eq(samfDrivers.id, driverId))

			// B. Open a disciplinary file (Muy Grave)
			const fileId = `exp-auto-${Date.now()}`
			await db.insert(samfDisciplinaryFiles).values({
				id: fileId,
				driverId,
				teamId: driver.teamId,
				severity: 'MUY_GRAVE',
				description: `Positivo detectado en control de sustancias (${testType}). Nivel alcohol: ${alcValue}, Drogas: ${drugsResult}. Suspensión preventiva inmediata de licencia aplicada.`,
				fineAmount: '0.00', // To be resolved by committee
				pointsDocked: 0,
				licenseSuspensionDays: 0,
				status: 'OPEN',
				committeeId: inspectorId, // Initially created by inspector
				createdAt: new Date(),
			})

			disciplinaryFileCreated = true
		}

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Control registrado correctamente.',
				triggerAction: {
					disciplinaryFileCreated,
					licenseSuspended: isPositive,
					notified: true,
				},
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
