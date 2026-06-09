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

		const fullName = formData.get('fullName') as string
		const targetTeamId = formData.get('targetTeamId') as string

		const identityDocFile = formData.get('identityDocFile') as File
		const medicalCertificateFile = formData.get('medicalCertificateFile') as File
		const paymentProofFile = formData.get('paymentProofFile') as File

		// Validation
		if (
			!fullName ||
			!targetTeamId ||
			!identityDocFile ||
			!medicalCertificateFile ||
			!paymentProofFile
		) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Faltan campos obligatorios (fullName, targetTeamId, identityDocFile, medicalCertificateFile, paymentProofFile).',
			)
		}

		// Save files
		const identityDocUrl = await saveUploadedFile(identityDocFile, 'identity')
		const medicalCertificateUrl = await saveUploadedFile(medicalCertificateFile, 'medical')
		const paymentProofUrl = await saveUploadedFile(paymentProofFile, 'payments')

		// Build application payload
		const payload = {
			fullName,
			targetTeamId,
			identityDocUrl,
			medicalCertificateUrl,
		}

		const applicationId = `app-lic-${Date.now()}`

		await db.insert(samfApplications).values({
			id: applicationId,
			type: 'DRIVER_LICENSE',
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
				message: 'Solicitud de licencia de piloto recibida y registrada.',
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
