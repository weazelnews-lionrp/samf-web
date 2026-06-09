import { auth } from '@/lib/auth'
import { formatErrorResponse } from '@/lib/api-auth'
import type { APIRoute } from 'astro'

const handleLogout = async (request: Request, cookies: any) => {
	// Call Better-Auth API to invalidate session
	try {
		await auth.api.signOut({
			headers: request.headers,
		})
	} catch (err) {
		console.warn('Better-Auth signOut error (session might already be expired):', err)
	}

	// Delete the selected character cookie
	cookies.delete('samf_citizenid', {
		path: '/',
	})
}

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		await handleLogout(request, cookies)
		return new Response(
			JSON.stringify({
				success: true,
				message: 'Sesión cerrada correctamente.',
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

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
	try {
		await handleLogout(request, cookies)
		return redirect('/')
	} catch (error) {
		return redirect('/')
	}
}

