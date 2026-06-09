import { ApiError, verifyCharacter, formatErrorResponse } from '@/lib/api-auth'
import {
	db,
	samfApplications,
	samfSubstanceControls,
	samfDisciplinaryFiles,
	samfTeams,
} from 'db/config'
import { eq, or, desc } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ locals }) => {
	try {
		const citizenid = verifyCharacter(locals)

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		const notificationsList: any[] = []

		// 1. Fetch applications notifications
		const apps = await db
			.select()
			.from(samfApplications)
			.where(eq(samfApplications.userId, citizenid))
			.orderBy(desc(samfApplications.createdAt))
			.limit(20)

		for (const app of apps) {
			notificationsList.push({
				id: `app-notif-${app.id}`,
				title: `Trámite ${app.type} - ${app.status}`,
				message: `Su solicitud ha sido registrada como ${app.status}.${app.rejectionReason ? ` Motivo de rechazo: ${app.rejectionReason}` : ''}`,
				confidential: false,
				createdAt: app.resolvedAt || app.createdAt,
			})
		}

		// 2. Fetch substance controls notifications
		const controls = await db
			.select()
			.from(samfSubstanceControls)
			.where(eq(samfSubstanceControls.driverId, citizenid))
			.orderBy(desc(samfSubstanceControls.registeredAt))
			.limit(20)

		for (const ctrl of controls) {
			const hasFailed = ctrl.drugsResult === 'POSITIVE' || Number(ctrl.alcoholLevel) > 0.0
			notificationsList.push({
				id: `ctrl-notif-${ctrl.id}`,
				title: `Control de Sustancias - ${hasFailed ? 'INFRACCIÓN DETECTADA' : 'APTO / NEGATIVO'}`,
				message: `Resultado del test pre/post evento: Nivel Alcohol: ${ctrl.alcoholLevel}, Test Drogas: ${ctrl.drugsResult}.`,
				confidential: true,
				createdAt: ctrl.registeredAt,
			})
		}

		// 3. Fetch team association for team-specific disciplinary files
		const teamData = await db
			.select({ id: samfTeams.id })
			.from(samfTeams)
			.where(eq(samfTeams.directorId, citizenid))
			.limit(1)

		const teamId = teamData[0]?.id

		// 4. Fetch disciplinary files notifications
		const conditions = [eq(samfDisciplinaryFiles.driverId, citizenid)]
		if (teamId) {
			conditions.push(eq(samfDisciplinaryFiles.teamId, teamId))
		}

		const files = await db
			.select()
			.from(samfDisciplinaryFiles)
			.where(or(...conditions))
			.orderBy(desc(samfDisciplinaryFiles.createdAt))
			.limit(20)

		for (const file of files) {
			notificationsList.push({
				id: `disp-notif-${file.id}`,
				title: `Expediente Disciplinario (${file.severity}) - ${file.status}`,
				message: `Descripción: ${file.description}.${file.resolutionText ? ` Resolución: ${file.resolutionText}` : ''}`,
				confidential: true,
				createdAt: file.resolvedAt || file.createdAt,
			})
		}

		// Sort all notifications by date descending
		notificationsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

		return new Response(
			JSON.stringify({
				success: true,
				notifications: notificationsList,
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
