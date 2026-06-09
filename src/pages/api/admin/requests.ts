import { ApiError, requireRole, formatErrorResponse } from '@/lib/api-auth'
import { db, samfApplications, samfUsers } from 'db/config'
import { eq, and } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ url, locals }) => {
	try {
		// Valid for admin staff and technical inspectors
		requireRole(locals, ['STAFF_ADMIN', 'STAFF_INSPECTOR'])

		if (!db) {
			throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database connection not available.')
		}

		const typeParam = url.searchParams.get('type')
		const statusParam = (url.searchParams.get('status') ?? 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED'

		const conditions = [eq(samfApplications.status, statusParam)]

		if (typeParam) {
			const allowedTypes = [
				'TEAM_REGISTRATION',
				'DRIVER_LICENSE',
				'DELEGATED_EVENT',
				'CATALOG_INCLUSION',
				'VEHICLE_HOMOLOGATION',
			]
			if (allowedTypes.includes(typeParam)) {
				conditions.push(eq(samfApplications.type, typeParam as any))
			}
		}

		const requests = await db
			.select({
				id: samfApplications.id,
				type: samfApplications.type,
				userId: samfApplications.userId,
				userName: samfUsers.name,
				payload: samfApplications.payload,
				paymentProofUrl: samfApplications.paymentProofUrl,
				status: samfApplications.status,
				createdAt: samfApplications.createdAt,
			})
			.from(samfApplications)
			.leftJoin(samfUsers, eq(samfApplications.userId, samfUsers.id))
			.where(and(...conditions))
			.orderBy(samfApplications.createdAt)

		return new Response(
			JSON.stringify({
				success: true,
				requests: requests.map((r) => ({
					...r,
					payload: JSON.parse(r.payload),
				})),
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
