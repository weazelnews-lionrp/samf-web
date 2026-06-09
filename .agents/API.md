# Diseño de API de la Federación de Automovilismo de San Andreas (SAMF)

Este documento describe la arquitectura y especificación detallada de la API para la plataforma web de la **San Andreas Motorsports Federation (SAMF)**, en total conformidad con la _Ley de Competición y Regulación de Carreras Profesionales Automovilísticas_ y la estructura descrita en [AGENTS.md](file:///d:/Users/Cocodrulo/Documents/Github/samf-web/.agents/AGENTS.md).

---

## 1. Arquitectura y Tecnologías

La API está diseñada para funcionar sobre la arquitectura existente:

- **Framework**: Astro (Endpoint Routes / API Routes en `src/pages/api/*`).
- **Autenticación**: `auth-astro` con proveedor de Discord.
- **Base de Datos**: MySQL gestionado mediante **Drizzle ORM**.
- **Formato de datos**: JSON para todas las peticiones y respuestas.
- **Manejo de archivos**: Carga de documentos (justificantes de pago, certificados médicos, PDFs de reglamentos) mediante codificación `multipart/form-data` hacia almacenamiento en la nube (ej. Vercel Blob / S3) y guardando la URL correspondiente en la base de datos.

---

## 2. Modelo de Roles y Permisos (RBAC)

La API implementa un control de acceso basado en roles (Role-Based Access Control) que se recupera en la sesión del usuario autenticado vía Discord:

| Rol                       | Código                   | Permisos y Alcance                                                                                                                           |
| :------------------------ | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Público / Aficionado**  | `PUBLIC`                 | Acceso de lectura a noticias, calendarios, clasificaciones y portal de transparencia. Sin necesidad de login.                                |
| **Piloto**                | `PILOTO`                 | Gestión de su licencia de piloto, solicitudes de homologación de sus vehículos, buzón de notificaciones confidenciales.                      |
| **Director de Escudería** | `DIRECTOR_ESCUDERIA`     | Gestión corporativa del equipo, composición de plantilla, patrocinadores, publicación de boletines oficiales, registro de tasas y vehículos. |
| **Administrador SAMF**    | `STAFF_ADMIN`            | Resolución de trámites administrativos, creación de temporadas, carreras y publicación de resultados/premios.                                |
| **Inspector Técnico**     | `STAFF_INSPECTOR`        | Homologación de vehículos (inspección de seguridad), auditoría de seguridad de circuitos y registro de controles de alcohol/sustancias.      |
| **Comité de Disciplina**  | `STAFF_DISCIPLINA`       | Apertura y resolución de expedientes disciplinarios, aplicación de sanciones, multas e inhabilitaciones.                                     |
| **Director General SAMF** | `STAFF_DIRECTOR_GENERAL` | Revisión y resolución final sobre recursos de apelación interpuestos contra sanciones del Comité.                                            |

---

## 3. Estructura de la Base de Datos (Esquema Drizzle ORM)

Para garantizar la coherencia de la API, se propone el siguiente esquema de Drizzle ORM en `src/db/schema.ts` (conceptual). Todas las tablas en BDD deben estar precedidas de "SAMF":

```typescript
import {
	mysqlTable,
	varchar,
	text,
	int,
	decimal,
	timestamp,
	boolean,
	mysqlEnum,
} from 'drizzle-orm/mysql-core'

// 1. Usuarios y Roles
export const users = mysqlTable('users', {
	id: varchar('id', { length: 255 }).primaryKey(), // Discord ID
	email: varchar('email', { length: 255 }).notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	image: varchar('image', { length: 255 }),
	role: mysqlEnum('role', [
		'PUBLIC',
		'PILOTO',
		'DIRECTOR_ESCUDERIA',
		'STAFF_ADMIN',
		'STAFF_INSPECTOR',
		'STAFF_DISCIPLINA',
		'STAFF_DIRECTOR_GENERAL',
	])
		.default('PUBLIC')
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 2. Escuderías
export const teams = mysqlTable('teams', {
	id: varchar('id', { length: 255 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	logo: varchar('logo', { length: 255 }).notNull(),
	directorId: varchar('director_id', { length: 255 }).references(() => users.id),
	visualBadge: varchar('visual_badge', { length: 255 }), // Distintivo visual
	registeredAt: timestamp('registered_at'),
	status: mysqlEnum('status', ['PENDING', 'ACTIVE', 'SUSPENDED']).default('PENDING').notNull(),
	points: int('points').default(0).notNull(), // Para constructores
})

// 3. Pilotos (Perfil Deportivo)
export const drivers = mysqlTable('drivers', {
	id: varchar('id', { length: 255 })
		.primaryKey()
		.references(() => users.id),
	name: varchar('name', { length: 255 }).notNull(),
	photo: varchar('photo', { length: 255 }),
	nationality: varchar('nationality', { length: 100 }),
	teamId: varchar('team_id', { length: 255 }).references(() => teams.id),
	licenseStatus: mysqlEnum('license_status', ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'NONE'])
		.default('NONE')
		.notNull(),
	licenseExpiry: timestamp('license_expiry'),
	isRookie: boolean('is_rookie').default(true).notNull(),
	points: int('points').default(0).notNull(), // Para pilotos
	rookiePoints: int('rookie_points').default(0).notNull(), // Trofeo Novato
})

// 4. Estadísticas del Piloto
export const driverStats = mysqlTable('driver_stats', {
	driverId: varchar('driver_id', { length: 255 })
		.primaryKey()
		.references(() => drivers.id),
	poles: int('poles').default(0).notNull(),
	fastestLaps: int('fastest_laps').default(0).notNull(),
	wins: int('wins').default(0).notNull(),
	podiums: int('podiums').default(0).notNull(),
	racesCompleted: int('races_completed').default(0).notNull(),
})

// 5. Patrocinadores de Escudería
export const sponsorships = mysqlTable('sponsorships', {
	id: varchar('id', { length: 255 }).primaryKey(),
	teamId: varchar('team_id', { length: 255 })
		.references(() => teams.id)
		.notNull(),
	companyName: varchar('company_name', { length: 255 }).notNull(),
	taxId: varchar('tax_id', { length: 100 }).notNull(), // Registro mercantil
	declarationNoDebt: boolean('declaration_no_debt').default(false).notNull(),
	registeredAt: timestamp('registered_at').defaultNow().notNull(),
})

// 6. Catálogo de Vehículos Autorizados por la SAMF
export const vehicleCatalog = mysqlTable('vehicle_catalog', {
	id: varchar('id', { length: 255 }).primaryKey(),
	brand: varchar('brand', { length: 100 }).notNull(),
	model: varchar('model', { length: 100 }).notNull(),
	category: mysqlEnum('category', [
		'SUPERDEPORTIVOS',
		'PRO_STOCK',
		'FORMULA',
		'RALLY',
		'GT',
	]).notNull(),
	approvedAt: timestamp('approved_at').defaultNow().notNull(),
})

// 7. Homologación Individual de Vehículos
export const vehicleHomologation = mysqlTable('vehicle_homologation', {
	id: varchar('id', { length: 255 }).primaryKey(), // ID de Homologación (Chasis)
	modelId: varchar('model_id', { length: 255 })
		.references(() => vehicleCatalog.id)
		.notNull(),
	teamId: varchar('team_id', { length: 255 }).references(() => teams.id),
	driverId: varchar('driver_id', { length: 255 }).references(() => drivers.id),
	chassisNumber: varchar('chassis_number', { length: 255 }).unique().notNull(),
	rollCage: boolean('roll_cage').default(false).notNull(),
	fireExtinguisher: boolean('fire_extinguisher').default(false).notNull(),
	harnessFourPoints: boolean('harness_four_points').default(false).notNull(),
	certifiedSeat: boolean('certified_seat').default(false).notNull(),
	controlECU: boolean('control_ecu').default(false).notNull(),
	tiresCategory: varchar('tires_category', { length: 100 }).notNull(),
	approvedAt: timestamp('approved_at'),
	expiresAt: timestamp('expires_at'), // 1 año de duración (Art 9.3)
	status: mysqlEnum('status', ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'])
		.default('PENDING')
		.notNull(),
})

// 8. Circuitos
export const circuits = mysqlTable('circuits', {
	id: varchar('id', { length: 255 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	length: int('length').notNull(), // En metros
	turnsCount: int('turns_count').notNull(),
	mapUrl: varchar('map_url', { length: 255 }),
	location: varchar('location', { length: 255 }).notNull(),
	lastAuditDate: timestamp('last_audit_date'),
	status: mysqlEnum('status', ['APPROVED', 'PENDING_AUDIT', 'SUSPENDED'])
		.default('APPROVED')
		.notNull(),
})

// 9. Carreras / Grandes Premios
export const grandPrixEvents = mysqlTable('grand_prix_events', {
	id: varchar('id', { length: 255 }).primaryKey(),
	season: int('season').notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	circuitId: varchar('circuit_id', { length: 255 })
		.references(() => circuits.id)
		.notNull(),
	startDate: timestamp('start_date').notNull(),
	endDate: timestamp('end_date').notNull(),
	status: mysqlEnum('status', ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
		.default('SCHEDULED')
		.notNull(),
})

// 10. Resultados de Carreras
export const raceResults = mysqlTable('race_results', {
	id: varchar('id', { length: 255 }).primaryKey(),
	gpId: varchar('gp_id', { length: 255 })
		.references(() => grandPrixEvents.id)
		.notNull(),
	driverId: varchar('driver_id', { length: 255 })
		.references(() => drivers.id)
		.notNull(),
	teamId: varchar('team_id', { length: 255 })
		.references(() => teams.id)
		.notNull(),
	startPosition: int('start_position').notNull(), // Pole Position is 1
	finishPosition: int('finish_position'), // null si DNF
	pointsAwarded: int('points_awarded').default(0).notNull(),
	fastestLap: boolean('fastest_lap').default(false).notNull(),
	status: mysqlEnum('status', ['FINISHED', 'DNF', 'DSQ', 'DNS']).default('FINISHED').notNull(),
})

// 11. Solicitudes Administrativas (Trámites)
export const applications = mysqlTable('applications', {
	id: varchar('id', { length: 255 }).primaryKey(),
	type: mysqlEnum('type', [
		'TEAM_REGISTRATION',
		'DRIVER_LICENSE',
		'DELEGATED_EVENT',
		'CATALOG_INCLUSION',
		'VEHICLE_HOMOLOGATION',
	]).notNull(),
	userId: varchar('user_id', { length: 255 })
		.references(() => users.id)
		.notNull(),
	payload: text('payload').notNull(), // JSON serializado con los campos específicos del trámite
	paymentProofUrl: varchar('payment_proof_url', { length: 255 }), // Justificante de pago de tasas
	status: mysqlEnum('status', ['PENDING', 'APPROVED', 'REJECTED']).default('PENDING').notNull(),
	reviewerId: varchar('reviewer_id', { length: 255 }).references(() => users.id),
	rejectionReason: text('rejection_reason'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	resolvedAt: timestamp('resolved_at'),
})

// 12. Boletines de Escudería
export const bulletins = mysqlTable('bulletins', {
	id: varchar('id', { length: 255 }).primaryKey(),
	teamId: varchar('team_id', { length: 255 })
		.references(() => teams.id)
		.notNull(),
	title: varchar('title', { length: 255 }).notNull(),
	content: text('content').notNull(), // HTML enriquecido o Markdown
	authorId: varchar('author_id', { length: 255 })
		.references(() => users.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

// 13. Controles de Alcohol y Sustancias Confidenciales
export const substanceControls = mysqlTable('substance_controls', {
	id: varchar('id', { length: 255 }).primaryKey(),
	gpId: varchar('gp_id', { length: 255 })
		.references(() => grandPrixEvents.id)
		.notNull(),
	driverId: varchar('driver_id', { length: 255 })
		.references(() => drivers.id)
		.notNull(),
	testType: mysqlEnum('test_type', ['PRE_EVENT', 'POST_EVENT']).notNull(),
	alcoholLevel: decimal('alcohol_level', { precision: 4, scale: 2 }).notNull(),
	drugsResult: mysqlEnum('drugs_result', ['NEGATIVE', 'POSITIVE']).notNull(),
	inspectorId: varchar('inspector_id', { length: 255 })
		.references(() => users.id)
		.notNull(),
	registeredAt: timestamp('registered_at').defaultNow().notNull(),
	notified: boolean('notified').default(false).notNull(),
})

// 14. Expedientes Sancionadores (Régimen Disciplinario)
export const disciplinaryFiles = mysqlTable('disciplinary_files', {
	id: varchar('id', { length: 255 }).primaryKey(),
	driverId: varchar('driver_id', { length: 255 }).references(() => drivers.id),
	teamId: varchar('team_id', { length: 255 }).references(() => teams.id),
	severity: mysqlEnum('severity', ['LEVE', 'GRAVE', 'MUY_GRAVE']).notNull(),
	description: text('description').notNull(),
	fineAmount: decimal('fine_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
	pointsDocked: int('points_docked').default(0).notNull(),
	licenseSuspensionDays: int('license_suspension_days').default(0).notNull(),
	status: mysqlEnum('status', ['OPEN', 'RESOLVED', 'APPEALED', 'CLOSED']).default('OPEN').notNull(),
	resolutionText: text('resolution_text'),
	committeeId: varchar('committee_id', { length: 255 })
		.references(() => users.id)
		.notNull(), // Miembro del Comité
	createdAt: timestamp('created_at').defaultNow().notNull(),
	resolvedAt: timestamp('resolved_at'),
})

// 15. Recursos de Apelación
export const appeals = mysqlTable('appeals', {
	id: varchar('id', { length: 255 }).primaryKey(),
	fileId: varchar('file_id', { length: 255 })
		.references(() => disciplinaryFiles.id)
		.notNull(),
	appellantId: varchar('appellant_id', { length: 255 })
		.references(() => users.id)
		.notNull(),
	justification: text('justification').notNull(),
	status: mysqlEnum('status', ['PENDING', 'ACCEPTED', 'REJECTED']).default('PENDING').notNull(),
	resolutionText: text('resolution_text'),
	generalDirectorId: varchar('general_director_id', { length: 255 }).references(() => users.id),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	resolvedAt: timestamp('resolved_at'),
})

// 16. Transparencia y Sede Electrónica (Subidas de la SAMF)
export const transparencyDocs = mysqlTable('transparency_docs', {
	id: varchar('id', { length: 255 }).primaryKey(),
	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	category: mysqlEnum('category', [
		'PRESUPUESTO',
		'AUDITORIA',
		'REGLAMENTO_TECNICO',
		'ANUNCIO_PREMIOS',
		'OTROS',
	]).notNull(),
	fileUrl: varchar('file_url', { length: 255 }).notNull(),
	publishedAt: timestamp('published_at').defaultNow().notNull(),
})
```

---

## 4. Estructura del Manejo de Errores Globales

Todas las respuestas con código de estado diferente a `2xx` tendrán la siguiente estructura:

```json
{
	"success": false,
	"error": {
		"code": "BAD_REQUEST",
		"message": "Descripción detallada del error de negocio o validación.",
		"details": [] // Detalles de validaciones específicas (ej. Zod)
	}
}
```

---

## 5. Especificaciones Detalladas de Endpoints

### 5.1. Módulo: Autenticación e Información del Usuario

#### GET `/api/user/profile`

- **Descripción**: Obtiene la información del perfil del usuario autenticado en base a la sesión de Discord.
- **Autenticación requerida**: Sí (Cualquier rol).
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"user": {
  		"id": "123456789012345678",
  		"email": "user@discord.com",
  		"name": "John Doe",
  		"image": "https://cdn.discordapp.com/avatars/...",
  		"role": "DIRECTOR_ESCUDERIA"
  	},
  	"associatedEntity": {
  		"type": "team",
  		"id": "team-456",
  		"name": "Grotti Corse"
  	}
  }
  ```

---

### 5.2. Módulo: Directorio Público (Escuderías, Pilotos, Calendarios y Resultados)

#### GET `/api/teams`

- **Descripción**: Obtiene la lista de escuderías registradas en la liga estatal.
- **Autenticación requerida**: No.
- **Parámetros de consulta (Query)**:
  - `status`: `ACTIVE` (por defecto), `SUSPENDED`
  - `search`: Cadena de texto para buscar por nombre
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"teams": [
  		{
  			"id": "team-001",
  			"name": "Benefactor Racing",
  			"logo": "https://samf.lioncommunity.es/images/teams/benefactor.png",
  			"visualBadge": "#FF0000",
  			"directorName": "Michael De Santa",
  			"status": "ACTIVE",
  			"points": 145
  		}
  	]
  }
  ```

#### GET `/api/teams/[teamId]`

- **Descripción**: Detalle completo de una escudería, incluyendo pilotos vinculados, patrocinadores activos y tablón de boletines públicos.
- **Autenticación requerida**: No.
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"team": {
  		"id": "team-001",
  		"name": "Benefactor Racing",
  		"logo": "https://samf.lioncommunity.es/images/teams/benefactor.png",
  		"director": {
  			"id": "usr-99",
  			"name": "Michael De Santa"
  		},
  		"visualBadge": "#FF0000",
  		"status": "ACTIVE",
  		"points": 145,
  		"sponsors": ["Vangelico Jewelry", "FlyUS"],
  		"drivers": [
  			{
  				"id": "drv-007",
  				"name": "Franklin Clinton",
  				"photo": "https://samf.lioncommunity.es/images/drivers/franklin.png",
  				"licenseStatus": "ACTIVE",
  				"isRookie": true
  			}
  		],
  		"bulletins": [
  			{
  				"id": "bulletin-1",
  				"title": "Presentación de Patrocinio con Vangelico",
  				"content": "<p>Nos complace anunciar la alianza comercial...</p>",
  				"createdAt": "2026-06-09T18:00:00Z"
  			}
  		],
  		"palmares": {
  			"constructorsChampionships": 1,
  			"raceWins": 12
  		}
  	}
  }
  ```

#### GET `/api/drivers/[driverId]`

- **Descripción**: Obtiene la ficha detallada del piloto, su biografía, estadísticas de carrera acumuladas y estado legal de su licencia SAMF.
- **Autenticación requerida**: No.
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"driver": {
  		"id": "drv-007",
  		"name": "Franklin Clinton",
  		"photo": "https://samf.lioncommunity.es/images/drivers/franklin.png",
  		"nationality": "American",
  		"licenseStatus": "ACTIVE",
  		"licenseExpiry": "2027-06-09T00:00:00Z",
  		"isRookie": true,
  		"points": 85,
  		"team": {
  			"id": "team-001",
  			"name": "Benefactor Racing"
  		},
  		"stats": {
  			"poles": 3,
  			"fastestLaps": 2,
  			"wins": 4,
  			"podiums": 7,
  			"racesCompleted": 10
  		}
  	}
  }
  ```

#### GET `/api/calendar`

- **Descripción**: Obtiene el calendario oficial de Grandes Premios de la temporada actual.
- **Autenticación requerida**: No.
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"events": [
  		{
  			"id": "gp-los-santos",
  			"season": 2025,
  			"name": "San Andreas Grand Prix",
  			"circuit": {
  				"name": "Maze Bank Circuit",
  				"location": "Los Santos",
  				"length": 4500,
  				"turnsCount": 16,
  				"mapUrl": "https://samf.lioncommunity.es/maps/maze-bank.png"
  			},
  			"startDate": "2026-07-18T10:00:00Z",
  			"endDate": "2026-07-20T18:00:00Z",
  			"status": "SCHEDULED"
  		}
  	]
  }
  ```

#### GET `/api/results/[raceId]`

- **Descripción**: Devuelve los resultados oficiales detallados de una carrera específica.
- **Autenticación requerida**: No.
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"raceResults": {
  		"gpId": "gp-los-santos",
  		"gpName": "San Andreas Grand Prix",
  		"polePosition": {
  			"driverId": "drv-007",
  			"driverName": "Franklin Clinton",
  			"teamName": "Benefactor Racing"
  		},
  		"fastestLap": {
  			"driverId": "drv-007",
  			"driverName": "Franklin Clinton"
  		},
  		"positions": [
  			{
  				"position": 1,
  				"driverName": "Franklin Clinton",
  				"teamName": "Benefactor Racing",
  				"pointsAwarded": 25,
  				"status": "FINISHED"
  			},
  			{
  				"position": 2,
  				"driverName": "Lamar Davis",
  				"teamName": "Grotti Corse",
  				"pointsAwarded": 18,
  				"status": "FINISHED"
  			}
  		]
  	}
  }
  ```

#### GET `/api/standings`

- **Descripción**: Obtiene la tabla clasificatoria de pilotos, constructores y trofeo del novato.
- **Autenticación requerida**: No.
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"driversStandings": [
  		{
  			"position": 1,
  			"driverName": "Franklin Clinton",
  			"teamName": "Benefactor Racing",
  			"points": 85
  		}
  	],
  	"constructorsStandings": [{ "position": 1, "teamName": "Benefactor Racing", "points": 145 }],
  	"rookieStandings": [{ "position": 1, "driverName": "Franklin Clinton", "points": 85 }]
  }
  ```

#### GET `/api/transparency/documents`

- **Descripción**: Lista las publicaciones y documentos del Portal de Transparencia (Auditorías, Reglamentos, Cuentas Anuales, etc.).
- **Autenticación requerida**: No.
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"documents": [
  		{
  			"id": "trans-doc-1",
  			"title": "Reglamento Técnico de Competición 2025",
  			"description": "Especificaciones obligatorias para vehículos de motor.",
  			"category": "REGLAMENTO_TECNICO",
  			"fileUrl": "https://samf.lioncommunity.es/docs/reglamento-tecnico-2025.pdf",
  			"publishedAt": "2026-01-01T08:00:00Z"
  		}
  	]
  }
  ```

---

### 5.3. Módulo: Portal Privado (Trámites y Autogestión)

#### POST `/api/private/applications/team-registration`

- **Descripción**: Permite enviar una solicitud de inscripción para una nueva escudería bajo el Art. 12.1.
- **Autenticación requerida**: Sí (`PUBLIC` o `DIRECTOR_ESCUDERIA`).
- **Encabezados**: `Content-Type: multipart/form-data`
- **Campos del Formulario**:
  - `name`: Nombre de la escudería (ej. "Grotti Corse")
  - `visualBadge`: Color o patrón distintivo (ej. "#FF0000")
  - `initialDrivers`: Listado JSON de IDs de pilotos (ej. `["usr-302", "usr-304"]`)
  - `responsibleDeclaration`: Aceptación de las normas (`true`/`false`)
  - `logoFile`: Archivo de imagen del logotipo (PNG/JPG)
  - `paymentProofFile`: Comprobante de pago de tasa de inscripción ($30,000) (PDF/Imagen)
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"applicationId": "app-team-reg-98213",
  	"status": "PENDING",
  	"message": "Solicitud de inscripción de escudería recibida. Se resolverá en un plazo máximo de 15 días hábiles."
  }
  ```

#### POST `/api/private/applications/driver-license`

- **Descripción**: Permite a un usuario solicitar o renovar su licencia de piloto SAMF (Art. 15.2).
- **Autenticación requerida**: Sí (`PUBLIC` o `PILOTO`).
- **Encabezados**: `Content-Type: multipart/form-data`
- **Campos del Formulario**:
  - `fullName`: Nombre completo
  - `targetTeamId`: ID de la escudería a la que se vincula
  - `identityDocFile`: Copia del documento de identidad (PDF/Imagen)
  - `medicalCertificateFile`: Certificado médico de aptitud firmado por facultativo (PDF)
  - `paymentProofFile`: Comprobante de pago de la tasa de obtención ($7,500) (PDF/Imagen)
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"applicationId": "app-lic-32123",
  	"status": "PENDING",
  	"message": "Solicitud de licencia de piloto recibida."
  }
  ```

#### POST `/api/private/applications/delegated-event`

- **Descripción**: Formulario para promotores privados para solicitar una autorización delegada para un evento (Rallys/Competiciones urbanas) (Art. 10bis.2). Debe presentarse con mínimo 10 días de antelación.
- **Autenticación requerida**: Sí (Cualquier usuario autenticado).
- **Encabezados**: `Content-Type: multipart/form-data`
- **Campos del Formulario**:
  - `organizerName`: Nombre del organizador/empresa
  - `eventTitle`: Título del evento
  - `description`: Detalles del evento
  - `routeLayoutFile`: Plano o mapa del trazado del evento (PDF/Imagen)
  - `securityPlanFile`: Plan de seguridad y emergencias (PDF)
  - `liabilityInsuranceFile`: Póliza de seguro de responsabilidad civil (PDF)
  - `acceptDelegatedDuties`: Aceptación de obligaciones (`true`)
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"applicationId": "app-event-4421",
  	"status": "PENDING",
  	"message": "Solicitud de evento delegada registrada correctamente. Plazo de resolución legal: 10 días hábiles."
  }
  ```

#### POST `/api/private/vehicles/catalog-inclusion`

- **Descripción**: Solicita que un nuevo modelo de vehículo sea añadido al Catálogo de Vehículos Autorizados de la SAMF (Art. 8.2).
- **Autenticación requerida**: Sí (`DIRECTOR_ESCUDERIA`).
- **Request Body (JSON)**:
  ```json
  {
  	"brand": "Grotti",
  	"model": "Itali GTO",
  	"category": "SUPERDEPORTIVOS",
  	"technicalSpecs": "Motor V12, 600hp, tracción total."
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"applicationId": "app-cat-992",
  	"status": "PENDING"
  }
  ```

#### POST `/api/private/vehicles/homologation`

- **Descripción**: Registra el chasis y solicita la homologación de seguridad de 1 año para un vehículo de competición específico (Art. 9.1).
- **Autenticación requerida**: Sí (`DIRECTOR_ESCUDERIA` o `PILOTO`).
- **Request Body (JSON)**:
  ```json
  {
  	"modelId": "vehicle-model-123",
  	"chassisNumber": "VIN-GROTTI-88273612-LS",
  	"safetyChecks": {
  		"rollCage": true,
  		"fireExtinguisher": true,
  		"harnessFourPoints": true,
  		"certifiedSeat": true,
  		"controlECU": true,
  		"tiresCategory": "Slick Competición Medium"
  	}
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"applicationId": "app-hom-1122",
  	"status": "PENDING",
  	"message": "Trámite de homologación creado. El Inspector Técnico revisará el vehículo físicamente y auditará el chasis."
  }
  ```

#### PUT `/api/private/team/composition`

- **Descripción**: Permite notificar cambios en la dirección o plantilla de pilotos (plazo máximo de 7 días hábiles, Art. 13.3).
- **Autenticación requerida**: Sí (`DIRECTOR_ESCUDERIA`).
- **Request Body (JSON)**:
  ```json
  {
  	"directorId": "usr-99",
  	"driversList": [
  		{ "driverId": "drv-007", "role": "TITULAR" },
  		{ "driverId": "drv-008", "role": "RESERVA" }
  	]
  }
  ```
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"message": "Composición de la escudería actualizada exitosamente."
  }
  ```

#### POST `/api/private/team/sponsorships`

- **Descripción**: Registra un nuevo contrato de patrocinio y la declaración responsable de ausencia de deudas con la administración (Art. 14.5).
- **Autenticación requerida**: Sí (`DIRECTOR_ESCUDERIA`).
- **Request Body (JSON)**:
  ```json
  {
  	"companyName": "Maze Bank",
  	"taxId": "B-9988221",
  	"declarationNoDebt": true
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"sponsorId": "spons-4412",
  	"message": "Contrato de patrocinio registrado."
  }
  ```

#### POST `/api/private/team/bulletins`

- **Descripción**: Publica un comunicado o boletín oficial de prensa en el perfil público de la escudería.
- **Autenticación requerida**: Sí (`DIRECTOR_ESCUDERIA`).
- **Request Body (JSON)**:
  ```json
  {
  	"title": "Nuevas mejoras aerodinámicas para el Gran Premio",
  	"content": "Hemos estado trabajando intensamente en el túnel de viento para traer un paquete aerodinámico..."
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"bulletinId": "bull-332",
  	"message": "Boletín de prensa publicado en el directorio público de la escudería."
  }
  ```

#### GET `/api/private/notifications`

- **Descripción**: Buzón confidencial de notificaciones del piloto o director de equipo (multas, suspensiones, resultados analíticos, resoluciones de trámites) (Art. 16.9 y 19.5).
- **Autenticación requerida**: Sí (`PILOTO` o `DIRECTOR_ESCUDERIA`).
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"notifications": [
  		{
  			"id": "notif-9912",
  			"title": "Notificación de Control de Sustancias - Apto",
  			"message": "Los resultados de la prueba realizada en el GP de Los Santos han arrojado valores negativos para todas las sustancias controladas.",
  			"confidential": true,
  			"createdAt": "2026-06-09T19:30:00Z"
  		}
  	]
  }
  ```

---

### 5.4. Módulo: Intranet y Gestión Interna (Personal SAMF)

#### GET `/api/admin/requests`

- **Descripción**: Recupera todas las solicitudes pendientes de resolución.
- **Autenticación requerida**: Sí (`STAFF_ADMIN` o `STAFF_INSPECTOR`).
- **Parámetros de consulta (Query)**:
  - `type`: Filtrar por tipo de trámite (`TEAM_REGISTRATION`, etc.)
  - `status`: `PENDING` (por defecto), `APPROVED`, `REJECTED`
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"requests": [
  		{
  			"id": "app-team-reg-98213",
  			"type": "TEAM_REGISTRATION",
  			"userId": "usr-discord-5",
  			"userName": "Michael De Santa",
  			"createdAt": "2026-06-09T18:30:00Z",
  			"paymentProofUrl": "https://samf.lioncommunity.es/uploads/payments/receipt-grotti.pdf"
  		}
  	]
  }
  ```

#### POST `/api/admin/requests/[requestId]/resolve`

- **Descripción**: Resuelve un trámite aprobándolo o rechazándolo.
- **Autenticación requerida**: Sí (`STAFF_ADMIN` o `STAFF_INSPECTOR` para trámites técnicos).
- **Request Body (JSON)**:
  ```json
  {
  	"status": "APPROVED", // 'APPROVED' o 'REJECTED'
  	"rejectionReason": "" // Obligatorio si el estado es REJECTED
  }
  ```
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"message": "Solicitud resuelta con éxito. Notificación enviada al solicitante."
  }
  ```

#### POST `/api/admin/competitions/seasons`

- **Descripción**: Crea una nueva temporada y define los parámetros iniciales.
- **Autenticación requerida**: Sí (`STAFF_ADMIN`).
- **Request Body (JSON)**:
  ```json
  {
  	"seasonYear": 2025,
  	"prizesAnnouncementUrl": "https://samf.lioncommunity.es/docs/prizes-2025.pdf" // 30 días de antelación (Art 22.1)
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"message": "Temporada creada correctamente."
  }
  ```

#### POST `/api/admin/competitions/races/[raceId]/results`

- **Descripción**: Publica los resultados oficiales de una carrera. La API recalcula automáticamente los puntos de pilotos y constructores, y asigna los puntos de pole y vuelta rápida (Art. 21).
- **Autenticación requerida**: Sí (`STAFF_ADMIN`).
- **Request Body (JSON)**:
  ```json
  {
  	"polePositionDriverId": "drv-007",
  	"fastestLapDriverId": "drv-007",
  	"results": [
  		{ "position": 1, "driverId": "drv-007", "status": "FINISHED" },
  		{ "position": 2, "driverId": "drv-008", "status": "FINISHED" },
  		{ "position": 3, "driverId": "drv-009", "status": "FINISHED" },
  		{ "position": 4, "driverId": "drv-010", "status": "FINISHED" },
  		{ "position": 5, "driverId": "drv-011", "status": "FINISHED" },
  		{ "position": 6, "driverId": "drv-012", "status": "FINISHED" },
  		{ "position": 7, "driverId": "drv-013", "status": "FINISHED" },
  		{ "position": 8, "driverId": "drv-014", "status": "FINISHED" },
  		{ "position": 9, "driverId": "drv-015", "status": "FINISHED" },
  		{ "position": 10, "driverId": "drv-016", "status": "FINISHED" }
  	]
  }
  ```
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"message": "Resultados publicados. Clasificaciones actualizadas.",
  	"pointsDistributed": {
  		"drv-007": 26, // 25 (1º) + 1 (vuelta rápida)
  		"drv-008": 18
  	}
  }
  ```

#### POST `/api/admin/security/circuit-audits`

- **Descripción**: Registra una inspección anual de seguridad para homologar un circuito (Art. 6.7).
- **Autenticación requerida**: Sí (`STAFF_INSPECTOR`).
- **Request Body (JSON)**:
  ```json
  {
  	"circuitId": "circuit-los-santos",
  	"inspectedAt": "2026-06-09T00:00:00Z",
  	"passed": true,
  	"observations": "Barreras de contención revisadas y conformes con el reglamento técnico.",
  	"auditReportUrl": "https://samf.lioncommunity.es/docs/audits/maze-bank-2026.pdf"
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"message": "Auditoría de circuito guardada correctamente. Circuito homologado para el año corriente."
  }
  ```

#### POST `/api/admin/security/substance-controls`

- **Descripción**: Registra los resultados de los controles de alcohol y drogas pre/post evento de un piloto (Art. 16.1). Si el resultado de drogas es `POSITIVE` o el nivel de alcohol excede el límite reglamentario:
  1. Envía de forma automatizada y confidencial una notificación al piloto.
  2. Envía una notificación a la escudería de la suspensión preventiva inmediata de la licencia.
  3. Crea de manera automática un expediente disciplinario por infracción Muy Grave en el Comité de Disciplina.
- **Autenticación requerida**: Sí (`STAFF_INSPECTOR`).
- **Request Body (JSON)**:
  ```json
  {
  	"gpId": "gp-los-santos",
  	"driverId": "drv-007",
  	"testType": "POST_EVENT",
  	"alcoholLevel": 0.0,
  	"drugsResult": "NEGATIVE"
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"message": "Control registrado correctamente.",
  	"triggerAction": {
  		"disciplinaryFileCreated": false,
  		"notified": true
  	}
  }
  ```

#### POST `/api/admin/discipline/expedientes`

- **Descripción**: Abre un nuevo expediente sancionador a un piloto o escudería por parte de un miembro del Comité de Disciplina (Art. 18.1 / 19.1).
- **Autenticación requerida**: Sí (`STAFF_DISCIPLINA`).
- **Request Body (JSON)**:
  ```json
  {
  	"driverId": "drv-007",
  	"teamId": "team-001",
  	"severity": "MUY_GRAVE", // LEVE, GRAVE, MUY_GRAVE
  	"description": "Positivo detectado en control de sustancias pre-carrera."
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"fileId": "exp-2026-004",
  	"status": "OPEN",
  	"message": "Expediente disciplinario abierto con éxito."
  }
  ```

#### POST `/api/admin/discipline/expedientes/[fileId]/resolve`

- **Descripción**: Resuelve y cierra un expediente disciplinario aplicando la sanción determinada (Art. 19.5). Las sanciones pueden incluir suspensión temporal o definitiva de licencia, penalización de puntos en la liga, y multas financieras.
- **Autenticación requerida**: Sí (`STAFF_DISCIPLINA`).
- **Request Body (JSON)**:
  ```json
  {
  	"resolutionText": "Se determina la inhabilitación del piloto por un periodo de 90 días naturales y una multa de $15,000.",
  	"fineAmount": 15000.0,
  	"pointsDocked": 25,
  	"licenseSuspensionDays": 90
  }
  ```
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"message": "Expediente resuelto. Licencia de piloto suspendida y puntos restados.",
  	"newLicenseStatus": "SUSPENDED"
  }
  ```

#### POST `/api/admin/discipline/appeals`

- **Descripción**: Registra un recurso de apelación presentado por un piloto o escudería frente al Director General de la SAMF en el plazo legal (Art. 18.2).
- **Autenticación requerida**: Sí (`PILOTO` o `DIRECTOR_ESCUDERIA`).
- **Request Body (JSON)**:
  ```json
  {
  	"fileId": "exp-2026-004",
  	"justification": "Se alega error material en la lectura del espectrómetro de masas y se aporta contraanálisis independiente."
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
  	"success": true,
  	"appealId": "app-appeal-551",
  	"status": "PENDING"
  }
  ```

#### POST `/api/admin/discipline/appeals/[appealId]/resolve`

- **Descripción**: Resolución definitiva por el Director General de la SAMF para aceptar o rechazar una apelación.
- **Autenticación requerida**: Sí (`STAFF_DIRECTOR_GENERAL`).
- **Request Body (JSON)**:
  ```json
  {
  	"status": "ACCEPTED", // ACCEPTED o REJECTED
  	"resolutionText": "Visto el contraanálisis aportado por laboratorio homologado, se anula la sanción de suspensión de licencia."
  }
  ```
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
  	"success": true,
  	"message": "Recurso resuelto. Sanciones del expediente revocadas.",
  	"updatedFileStatus": "RESOLVED"
  }
  ```
