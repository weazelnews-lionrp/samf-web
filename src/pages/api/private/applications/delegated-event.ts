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

		const organizerName = formData.get('organizerName') as string
		const eventTitle = formData.get('eventTitle') as string
		const description = formData.get('description') as string
		const acceptDelegatedDuties = formData.get('acceptDelegatedDuties') === 'true'

		const routeLayoutFile = formData.get('routeLayoutFile') as File
		const securityPlanFile = formData.get('securityPlanFile') as File
		const liabilityInsuranceFile = formData.get('liabilityInsuranceFile') as File

		// Validation
		if (
			!organizerName ||
			!eventTitle ||
			!description ||
			!routeLayoutFile ||
			!securityPlanFile ||
			!liabilityInsuranceFile
		) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Faltan campos obligatorios (organizerName, eventTitle, description, routeLayoutFile, securityPlanFile, liabilityInsuranceFile).',
			)
		}

		if (!acceptDelegatedDuties) {
			throw new ApiError(
				400,
				'BAD_REQUEST',
				'Debe aceptar las obligaciones delegadas para continuar.',
			)
		}

		// Save files
		const routeLayoutUrl = await saveUploadedFile(routeLayoutFile, 'events/layouts')
		const securityPlanUrl = await saveUploadedFile(securityPlanFile, 'events/security')
		const liabilityInsuranceUrl = await saveUploadedFile(liabilityInsuranceFile, 'events/insurance')

		// Build application payload
		const payload = {
			organizerName,
			eventTitle,
			description,
			routeLayoutUrl,
			securityPlanUrl,
			liabilityInsuranceUrl,
		}

		const applicationId = `app-event-${Date.now()}`

		await db.insert(samfApplications).values({
			id: applicationId,
			type: 'DELEGATED_EVENT',
			userId: citizenid,
			payload: JSON.stringify(payload),
			paymentProofUrl: null, // No fee mentioned for this application type
			status: 'PENDING',
			createdAt: new Date(),
		})

		return new Response(
			JSON.stringify({
				success: true,
				applicationId,
				status: 'PENDING',
				message:
					'Solicitud de evento delegada registrada correctamente. Plazo de resolución legal: 10 días hábiles.',
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
