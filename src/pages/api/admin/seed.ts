import { formatErrorResponse } from '@/lib/api-auth'
import { 
	db, 
	samfNews, 
	samfCircuits, 
	samfGrandPrixEvents 
} from 'db/config'
import { eq } from 'drizzle-orm'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () => {
	try {
		if (!db) {
			return new Response(
				JSON.stringify({ success: false, message: 'Database connection not available.' }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			)
		}

		// 1. Seed Circuits
		const circuitsToSeed = [
			{
				id: 'maze-bank-circuit',
				name: 'Maze Bank Circuit',
				length: 3200,
				turnsCount: 14,
				mapUrl: '',
				location: 'Los Santos',
				status: 'APPROVED' as const,
			},
			{
				id: 'redwood-lights-track',
				name: 'Redwood Lights Track',
				length: 4500,
				turnsCount: 18,
				mapUrl: '',
				location: 'Paleto Bay',
				status: 'APPROVED' as const,
			},
			{
				id: 'vinewood-circuit',
				name: 'Vinewood Circuit',
				length: 2800,
				turnsCount: 12,
				mapUrl: '',
				location: 'Los Santos',
				status: 'APPROVED' as const,
			},
			{
				id: 'alamo-sea-raceway',
				name: 'Alamo Sea Raceway',
				length: 3100,
				turnsCount: 11,
				mapUrl: '',
				location: 'Sandy Shores',
				status: 'APPROVED' as const,
			},
			{
				id: 'mount-chiliad',
				name: 'Mount Chiliad Track',
				length: 5200,
				turnsCount: 22,
				mapUrl: '',
				location: 'North Calafia',
				status: 'APPROVED' as const,
			}
		]

		for (const circuit of circuitsToSeed) {
			const existing = await db
				.select()
				.from(samfCircuits)
				.where(eq(samfCircuits.id, circuit.id))
				.limit(1)
			if (existing.length === 0) {
				await db.insert(samfCircuits).values(circuit)
			}
		}

		// 2. Seed Grand Prix Events
		const gpsToSeed = [
			{
				id: 'san-andreas-gp',
				season: 2025,
				name: 'San Andreas Grand Prix',
				circuitId: 'maze-bank-circuit',
				startDate: new Date('2025-07-18T10:00:00Z'),
				endDate: new Date('2025-07-20T18:00:00Z'),
				status: 'SCHEDULED' as const,
			},
			{
				id: 'redwood-endurance',
				season: 2025,
				name: 'Redwood Endurance',
				circuitId: 'redwood-lights-track',
				startDate: new Date('2025-08-08T10:00:00Z'),
				endDate: new Date('2025-08-10T18:00:00Z'),
				status: 'SCHEDULED' as const,
			},
			{
				id: 'vinewood-street',
				season: 2025,
				name: 'Vinewood Street Series',
				circuitId: 'vinewood-circuit',
				startDate: new Date('2025-08-29T10:00:00Z'),
				endDate: new Date('2025-08-31T18:00:00Z'),
				status: 'SCHEDULED' as const,
			},
			{
				id: 'alamo-sea-300',
				season: 2025,
				name: 'Alamo Sea 300',
				circuitId: 'alamo-sea-raceway',
				startDate: new Date('2025-09-19T10:00:00Z'),
				endDate: new Date('2025-09-21T18:00:00Z'),
				status: 'SCHEDULED' as const,
			},
			{
				id: 'mount-chiliad-hillclimb',
				season: 2025,
				name: 'Mount Chiliad Hillclimb',
				circuitId: 'mount-chiliad',
				startDate: new Date('2025-10-10T10:00:00Z'),
				endDate: new Date('2025-10-12T18:00:00Z'),
				status: 'SCHEDULED' as const,
			}
		]

		for (const gp of gpsToSeed) {
			const existing = await db
				.select()
				.from(samfGrandPrixEvents)
				.where(eq(samfGrandPrixEvents.id, gp.id))
				.limit(1)
			if (existing.length === 0) {
				await db.insert(samfGrandPrixEvents).values(gp)
			}
		}

		// 3. Seed News Posts
		const newsToSeed = [
			{
				id: 'reglamento-tecnico-2025',
				title: 'Nuevo Reglamento Técnico 2025',
				description: 'El SAMF publica las actualizaciones del reglamento técnico para todas las categorías del deporte motor en el estado.',
				content: `
					<p>La San Andreas Motorsports Federation (SAMF) ha publicado oficialmente el Reglamento Técnico de Competición que regirá la temporada 2025 de la Liga Estatal y eventos asociados, en estricto cumplimiento con el Artículo 7.1 de la Ley de Competición y Regulación de Carreras Profesionales Automovilísticas.</p>
					
					<h3>Principales Cambios y Homologaciones</h3>
					<p>El nuevo reglamento introduce modificaciones significativas destinadas a garantizar la máxima seguridad en pista y la igualdad competitiva entre escuderías:</p>
					<ul>
						<li><strong>Centralita de Control Única (ECU):</strong> A partir de esta temporada, todos los vehículos participantes deberán contar con la electrónica de control certificada por la federación para mitigar alteraciones de software ilegales (Art. 9.2e).</li>
						<li><strong>Sistemas de Retención:</strong> Se endurecen los estándares para arneses de seguridad, exigiendo un mínimo de 4 puntos de anclaje con fecha de fabricación vigente y asiento de competición homologado (Art. 9.2c y 9.2d).</li>
						<li><strong>Extinción Automática:</strong> Se hace obligatorio un sistema de extinción de incendios integrado y operable tanto por el piloto como desde el exterior del habitáculo (Art. 9.2b).</li>
					</ul>
					
					<h3>Calendario de Entrada en Vigor</h3>
					<p>Las especificaciones técnicas recogidas en este documento serán de obligado cumplimiento para todas las escuderías a partir del primer Gran Premio oficial. Se abrirá un periodo de inspecciones pre-evento en el circuito para asegurar que todos los chasis cumplan la normativa antes de su salida a pista.</p>
					
					<p>El documento completo en PDF está disponible para su libre descarga en el Portal de Transparencia del ciudadano (Sección de Reglamentación Técnica).</p>
				`,
				image: '/images/news_main.png',
				category: 'Oficial',
				isMain: true,
				createdAt: new Date('2025-06-01T09:00:00Z'),
				updatedAt: new Date('2025-06-01T09:00:00Z'),
			},
			{
				id: 'jovenes-talentos',
				title: 'Programa de desarrollo de jóvenes talentos 2025',
				description: 'Se abre el plazo de inscripción para el programa anual de formación y becas de la SAMF para nuevos pilotos residentes en el estado.',
				content: `
					<p>La federación anuncia el lanzamiento de la convocatoria oficial para el <strong>Programa Estatal de Jóvenes Talentos 2025</strong>, cuyo objetivo es descubrir, financiar y entrenar a la próxima generación de pilotos profesionales de San Andreas.</p>
					
					<h3>Becas y Soporte Técnico</h3>
					<p>Los pilotos seleccionados tendrán acceso a:</p>
					<ul>
						<li>Entrenamientos en simuladores profesionales de última generación en nuestra sede central.</li>
						<li>Asesoramiento físico, médico y psicológico deportivo personalizado.</li>
						<li>Beca financiera para cubrir el coste de la tasa de obtención de la licencia de piloto SAMF ($7,500 - Art. 15.3).</li>
						<li>Prácticas directas en pistas homologadas bajo la supervisión de inspectores de carrera experimentados.</li>
					</ul>
					
					<h3>Requisitos de Admisión</h3>
					<p>Para poder optar al programa, los candidatos deberán poseer una identificación de ciudadano válida (citizenid), un certificado médico de aptitud firmado por un facultativo del estado y no contar con sanciones graves del Comité de Disciplina de la federación en los últimos 24 meses.</p>
					
					<p>Las solicitudes y pruebas de selección se gestionarán a través de las oficinas de desarrollo de la SAMF.</p>
				`,
				image: '/images/news_talents.png',
				category: 'Comunicado',
				isMain: false,
				createdAt: new Date('2025-06-03T11:30:00Z'),
				updatedAt: new Date('2025-06-03T11:30:00Z'),
			},
			{
				id: 'seguridad-circuito',
				title: 'Nuevos estándares de seguridad en circuito',
				description: 'El Comité Técnico de Seguridad de la SAMF anuncia la actualización obligatoria del equipamiento de barreras y escapatorias.',
				content: `
					<p>En concordancia con el Artículo 6.7 de la Ley de Competición, que exige una auditoría anual de seguridad de todos los circuitos, el Comité de Seguridad de la SAMF ha emitido una directiva técnica urgente sobre los estándares de protección perimetral.</p>
					
					<h3>Mejoras Obligatorias en Trazados Homologados</h3>
					<p>Todas las pistas que alberguen eventos de la Liga Estatal (LSA) deberán adaptar sus instalaciones antes del inicio del campeonato:</p>
					<ul>
						<li><strong>Barreras Tecpro:</strong> Instalación obligatoria en zonas de alta velocidad y curvas de radio cerrado con escapatoria reducida.</li>
						<li><strong>Áreas de Retención de Grava:</strong> Renovación y arado de las camas de grava para optimizar la desaceleración segura de los vehículos fuera de pista.</li>
						<li><strong>Puestos de Comisarios:</strong> Refuerzo estructural con blindaje de seguridad para proteger al personal de pista y banderistas.</li>
					</ul>
					
					<p>Los inspectores de la SAMF realizarán auditorías físicas en cada trazado de manera previa al otorgamiento de la licencia del circuito para la temporada actual.</p>
				`,
				image: '/images/news_safety.png',
				category: 'Seguridad',
				isMain: false,
				createdAt: new Date('2025-06-05T14:15:00Z'),
				updatedAt: new Date('2025-06-05T14:15:00Z'),
			}
		]

		for (const newsPost of newsToSeed) {
			const existing = await db
				.select()
				.from(samfNews)
				.where(eq(samfNews.id, newsPost.id))
				.limit(1)
			if (existing.length === 0) {
				await db.insert(samfNews).values(newsPost)
			}
		}

		return new Response(
			JSON.stringify({ 
				success: true, 
				message: 'Seeding completed successfully! Circuits, Grand Prix events, and News posts populated.' 
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		)
	} catch (error: any) {
		return new Response(
			JSON.stringify({ success: false, error: error.message }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		)
	}
}
