import type { Locals } from 'astro'
import { promises as fs } from 'fs'
import path from 'path'

export class ApiError extends Error {
	status: number
	code: string
	details: any[]

	constructor(status: number, code: string, message: string, details: any[] = []) {
		super(message)
		this.status = status
		this.code = code
		this.details = details
		this.name = 'ApiError'
	}
}

/**
 * Ensures the user is logged into Discord.
 */
export function verifySession(locals: Locals): string {
	if (!locals.session || !locals.user) {
		throw new ApiError(401, 'UNAUTHORIZED', 'Inicie sesión con Discord para continuar.')
	}
	return locals.user.discordId ?? locals.user.id
}

/**
 * Ensures the user has selected a character.
 */
export function verifyCharacter(locals: Locals): string {
	verifySession(locals)
	if (!locals.citizenid || !locals.character) {
		throw new ApiError(
			401,
			'CHARACTER_NOT_SELECTED',
			'Debe seleccionar un personaje (citizenid) para realizar este trámite.',
		)
	}
	return locals.citizenid
}

/**
 * Ensures the active character has one of the allowed roles.
 */
export function requireRole(locals: Locals, allowedRoles: string | string[]): string {
	const citizenid = verifyCharacter(locals)
	const userRole = locals.user?.role ?? 'PUBLIC'

	const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

	// Superadmin and Director General bypass role checks
	if (userRole === 'STAFF_ADMIN' || userRole === 'STAFF_DIRECTOR_GENERAL') return citizenid

	if (!roles.includes(userRole)) {
		throw new ApiError(
			403,
			'FORBIDDEN',
			`No tiene permisos suficientes. Se requiere rol: ${roles.join(', ')}.`,
		)
	}

	return citizenid
}

/**
 * Global response formatter for errors.
 */
export function formatErrorResponse(error: unknown): Response {
	console.error('API Error:', error)

	if (error instanceof ApiError) {
		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: error.code,
					message: error.message,
					details: error.details,
				},
			}),
			{
				status: error.status,
				headers: { 'Content-Type': 'application/json' },
			},
		)
	}

	const message = error instanceof Error ? error.message : 'Error interno del servidor'
	return new Response(
		JSON.stringify({
			success: false,
			error: {
				code: 'INTERNAL_SERVER_ERROR',
				message,
				details: [],
			},
		}),
		{
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		},
	)
}

/**
 * Helper to wrap API handler and provide uniform JSON and error responses.
 */
export function apiHandler(handler: (context: any) => Promise<any>) {
	return async (context: any) => {
		try {
			const data = await handler(context)
			return new Response(JSON.stringify({ success: true, ...data }), {
				status: context.request.method === 'POST' ? 201 : 200,
				headers: { 'Content-Type': 'application/json' },
			})
		} catch (error) {
			return formatErrorResponse(error)
		}
	}
}

/**
 * Helper to handle file uploads and save them locally in public/uploads.
 */
export async function saveUploadedFile(file: File, folder: string): Promise<string> {
	if (!file || !(file instanceof File)) {
		throw new ApiError(400, 'BAD_REQUEST', 'Archivo no proporcionado o inválido.')
	}

	// Validate file type
	const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg']
	const ext = path.extname(file.name).toLowerCase()
	if (!allowedExtensions.includes(ext)) {
		throw new ApiError(
			400,
			'BAD_REQUEST',
			`Tipo de archivo no permitido. Solo se permiten: ${allowedExtensions.join(', ')}`,
		)
	}

	const buffer = Buffer.from(await file.arrayBuffer())
	const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`

	// Save to workspace public/uploads directory
	const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
	await fs.mkdir(uploadDir, { recursive: true })

	const filePath = path.join(uploadDir, filename)
	await fs.writeFile(filePath, buffer)

	// Return public URL relative path
	return `/uploads/${folder}/${filename}`
}
