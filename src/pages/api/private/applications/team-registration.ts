import { ApiError, verifyCharacter, saveUploadedFile, formatErrorResponse } from '@/lib/api-auth'
import { db, samfApplications } from 'db/config'
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const citizenid = verifyCharacter(locals)

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		let formData
		try {
			formData = await request.formData()
		} catch {
			throw new ApiError(400, 'BAD_REQUEST', 'Debe enviar una solicitud multipart/form-data válida.')
		}

		const name = formData.get('name') as string
		const visualBadge = formData.get('visualBadge') as string
		const initialDriversStr = formData.get('initialDrivers') as string
		const responsibleDeclaration = formData.get('responsibleDeclaration') === 'true'

		const logoFile = formData.get('logoFile') as File
		const paymentProofFile = formData.get('paymentProofFile') as File

		// Validation
		if (!name || !visualBadge || !logoFile || !paymentProofFile) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Faltan campos obligatorios (name, visualBadge, logoFile, paymentProofFile).',
			)
		}

		if (!responsibleDeclaration) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Debe aceptar la declaración responsable de cumplimiento de normas.',
			)
		}

		let initialDrivers = []
		if (initialDriversStr) {
			try {
				initialDrivers = JSON.parse(initialDriversStr)
			} catch {
				throw new ApiError(400, 'BAD_REQUEST', 'El campo initialDrivers debe ser un JSON válido.')
			}
		}

		// Save files
		const logoUrl = await saveUploadedFile(logoFile, 'logos')
		const paymentProofUrl = await saveUploadedFile(paymentProofFile, 'payments')

		// Build application payload
		const payload = {
			name,
			visualBadge,
			initialDrivers,
			logoUrl,
		}

		const applicationId = `app-team-reg-${Date.now()}`

		await db.insert(samfApplications).values({
			id: applicationId,
			type: 'TEAM_REGISTRATION',
			userId: citizenid,
			payload: JSON.stringify(payload),
			paymentProofUrl,
			status: 'PENDING',
			createdAt: new Date(),
		})

		return new Response(
			JSON.stringify({
				success: true,
				applicationId,
				status: 'PENDING',
				message:
					'Solicitud de inscripción de escudería recibida. Se resolverá en un plazo máximo de 15 días hábiles.',
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
