import {
	mysqlTable,
	varchar,
	text,
	int,
	decimal,
	datetime,
	boolean,
	mysqlEnum,
	longtext,
} from 'drizzle-orm/mysql-core'

// 1. Usuarios y Roles (Clave primaria: citizenid)
export const samfUsers = mysqlTable('samf_users', {
	id: varchar('id', { length: 50 }).primaryKey().unique(), // citizenid
	discordId: varchar('discord_id', { length: 50 }).notNull(), // Discord ID del usuario
	email: varchar('email', { length: 255 }).notNull(),
	name: varchar('name', { length: 255 }).notNull(), // Nombre del personaje (Firstname Lastname)
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
	createdAt: datetime('created_at').default(new Date()).notNull(),
})

// 2. Escuderías
export const samfTeams = mysqlTable('samf_teams', {
	id: varchar('id', { length: 50 }).primaryKey().unique(), // Identificador único (slug)
	name: varchar('name', { length: 255 }).notNull(),
	logo: varchar('logo', { length: 255 }).notNull(),
	directorId: varchar('director_id', { length: 50 }).references(() => samfUsers.id), // Link a samfUsers (citizenid)
	visualBadge: varchar('visual_badge', { length: 50 }), // Color o insignia visual (ej. #FF0000)
	registeredAt: datetime('registered_at').default(new Date()),
	status: mysqlEnum('status', ['PENDING', 'ACTIVE', 'SUSPENDED']).default('PENDING').notNull(),
	points: int('points').default(0).notNull(), // Puntos para el Campeonato de Constructores
})

// 3. Pilotos (Perfil Deportivo)
export const samfDrivers = mysqlTable('samf_drivers', {
	id: varchar('id', { length: 50 })
		.primaryKey()
		.unique()
		.references(() => samfUsers.id), // citizenid
	name: varchar('name', { length: 255 }).notNull(),
	photo: varchar('photo', { length: 255 }),
	nationality: varchar('nationality', { length: 100 }),
	teamId: varchar('team_id', { length: 50 }).references(() => samfTeams.id), // Escudería vinculada
	licenseStatus: mysqlEnum('license_status', ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'NONE'])
		.default('NONE')
		.notNull(),
	licenseExpiry: datetime('license_expiry'),
	isRookie: boolean('is_rookie').default(true).notNull(),
	points: int('points').default(0).notNull(), // Puntos para el Campeonato de Pilotos
	rookiePoints: int('rookie_points').default(0).notNull(), // Puntos para el Trofeo al Mejor Novato
})

// 4. Estadísticas del Piloto
export const samfDriverStats = mysqlTable('samf_driver_stats', {
	driverId: varchar('driver_id', { length: 50 })
		.primaryKey()
		.unique()
		.references(() => samfDrivers.id),
	poles: int('poles').default(0).notNull(),
	fastestLaps: int('fastest_laps').default(0).notNull(),
	wins: int('wins').default(0).notNull(),
	podiums: int('podiums').default(0).notNull(),
	racesCompleted: int('races_completed').default(0).notNull(),
})

// 5. Patrocinadores de Escudería
export const samfSponsorships = mysqlTable('samf_sponsorships', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	teamId: varchar('team_id', { length: 50 })
		.references(() => samfTeams.id)
		.notNull(),
	companyName: varchar('company_name', { length: 255 }).notNull(),
	taxId: varchar('tax_id', { length: 100 }).notNull(), // Registro mercantil
	declarationNoDebt: boolean('declaration_no_debt').default(false).notNull(),
	registeredAt: datetime('registered_at').default(new Date()).notNull(),
})

// 6. Catálogo de Vehículos Autorizados por la SAMF
export const samfVehicleCatalog = mysqlTable('samf_vehicle_catalog', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	brand: varchar('brand', { length: 100 }).notNull(),
	model: varchar('model', { length: 100 }).notNull(),
	category: mysqlEnum('category', [
		'SUPERDEPORTIVOS',
		'PRO_STOCK',
		'FORMULA',
		'RALLY',
		'GT',
	]).notNull(),
	approvedAt: datetime('approved_at').default(new Date()).notNull(),
})

// 7. Homologación Individual de Vehículos
export const samfVehicleHomologation = mysqlTable('samf_vehicle_homologation', {
	id: varchar('id', { length: 50 }).primaryKey().unique(), // ID de Homologación (Chasis / VIN)
	modelId: varchar('model_id', { length: 50 })
		.references(() => samfVehicleCatalog.id)
		.notNull(),
	teamId: varchar('team_id', { length: 50 }).references(() => samfTeams.id),
	driverId: varchar('driver_id', { length: 50 }).references(() => samfDrivers.id),
	chassisNumber: varchar('chassis_number', { length: 255 }).unique().notNull(),
	rollCage: boolean('roll_cage').default(false).notNull(),
	fireExtinguisher: boolean('fire_extinguisher').default(false).notNull(),
	harnessFourPoints: boolean('harness_four_points').default(false).notNull(),
	certifiedSeat: boolean('certified_seat').default(false).notNull(),
	controlECU: boolean('control_ecu').default(false).notNull(),
	tiresCategory: varchar('tires_category', { length: 100 }).notNull(),
	approvedAt: datetime('approved_at'),
	expiresAt: datetime('expires_at'), // 1 año de duración
	status: mysqlEnum('status', ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'])
		.default('PENDING')
		.notNull(),
})

// 8. Circuitos
export const samfCircuits = mysqlTable('samf_circuits', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	name: varchar('name', { length: 255 }).notNull(),
	length: int('length').notNull(), // En metros
	turnsCount: int('turns_count').notNull(),
	mapUrl: varchar('map_url', { length: 255 }),
	location: varchar('location', { length: 255 }).notNull(),
	lastAuditDate: datetime('last_audit_date'),
	status: mysqlEnum('status', ['APPROVED', 'PENDING_AUDIT', 'SUSPENDED'])
		.default('APPROVED')
		.notNull(),
})

// 9. Carreras / Grandes Premios
export const samfGrandPrixEvents = mysqlTable('samf_grand_prix_events', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	season: int('season').notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	circuitId: varchar('circuit_id', { length: 50 })
		.references(() => samfCircuits.id)
		.notNull(),
	startDate: datetime('start_date').notNull(),
	endDate: datetime('end_date').notNull(),
	status: mysqlEnum('status', ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
		.default('SCHEDULED')
		.notNull(),
})

// 10. Resultados de Carreras
export const samfRaceResults = mysqlTable('samf_race_results', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	gpId: varchar('gp_id', { length: 50 })
		.references(() => samfGrandPrixEvents.id)
		.notNull(),
	driverId: varchar('driver_id', { length: 50 })
		.references(() => samfDrivers.id)
		.notNull(),
	teamId: varchar('team_id', { length: 50 })
		.references(() => samfTeams.id)
		.notNull(),
	startPosition: int('start_position').notNull(),
	finishPosition: int('finish_position'), // null si DNF / DSQ / DNS
	pointsAwarded: int('points_awarded').default(0).notNull(),
	fastestLap: boolean('fastest_lap').default(false).notNull(),
	status: mysqlEnum('status', ['FINISHED', 'DNF', 'DSQ', 'DNS']).default('FINISHED').notNull(),
})

// 11. Solicitudes Administrativas (Trámites)
export const samfApplications = mysqlTable('samf_applications', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	type: mysqlEnum('type', [
		'TEAM_REGISTRATION',
		'DRIVER_LICENSE',
		'DELEGATED_EVENT',
		'CATALOG_INCLUSION',
		'VEHICLE_HOMOLOGATION',
	]).notNull(),
	userId: varchar('user_id', { length: 50 })
		.references(() => samfUsers.id)
		.notNull(), // citizenid
	payload: text('payload').notNull(), // JSON serializado con campos del formulario
	paymentProofUrl: varchar('payment_proof_url', { length: 255 }),
	status: mysqlEnum('status', ['PENDING', 'APPROVED', 'REJECTED']).default('PENDING').notNull(),
	reviewerId: varchar('reviewer_id', { length: 50 }).references(() => samfUsers.id),
	rejectionReason: text('rejection_reason'),
	createdAt: datetime('created_at').default(new Date()).notNull(),
	resolvedAt: datetime('resolved_at'),
})

// 12. Boletines de Escudería
export const samfBulletins = mysqlTable('samf_bulletins', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	teamId: varchar('team_id', { length: 50 })
		.references(() => samfTeams.id)
		.notNull(),
	title: varchar('title', { length: 255 }).notNull(),
	content: longtext('content').notNull(),
	authorId: varchar('author_id', { length: 50 })
		.references(() => samfUsers.id)
		.notNull(),
	createdAt: datetime('created_at').default(new Date()).notNull(),
	updatedAt: datetime('updated_at').default(new Date()).notNull(),
})

// 13. Controles de Alcohol y Sustancias Confidenciales
export const samfSubstanceControls = mysqlTable('samf_substance_controls', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	gpId: varchar('gp_id', { length: 50 })
		.references(() => samfGrandPrixEvents.id)
		.notNull(),
	driverId: varchar('driver_id', { length: 50 })
		.references(() => samfDrivers.id)
		.notNull(),
	testType: mysqlEnum('test_type', ['PRE_EVENT', 'POST_EVENT']).notNull(),
	alcoholLevel: decimal('alcohol_level', { precision: 4, scale: 2 }).notNull(),
	drugsResult: mysqlEnum('drugs_result', ['NEGATIVE', 'POSITIVE']).notNull(),
	inspectorId: varchar('inspector_id', { length: 50 })
		.references(() => samfUsers.id)
		.notNull(),
	registeredAt: datetime('registered_at').default(new Date()).notNull(),
	notified: boolean('notified').default(false).notNull(),
})

// 14. Expedientes Sancionadores (Régimen Disciplinario)
export const samfDisciplinaryFiles = mysqlTable('samf_disciplinary_files', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	driverId: varchar('driver_id', { length: 50 }).references(() => samfDrivers.id),
	teamId: varchar('team_id', { length: 50 }).references(() => samfTeams.id),
	severity: mysqlEnum('severity', ['LEVE', 'GRAVE', 'MUY_GRAVE']).notNull(),
	description: text('description').notNull(),
	fineAmount: decimal('fine_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
	pointsDocked: int('points_docked').default(0).notNull(),
	licenseSuspensionDays: int('license_suspension_days').default(0).notNull(),
	status: mysqlEnum('status', ['OPEN', 'RESOLVED', 'APPEALED', 'CLOSED']).default('OPEN').notNull(),
	resolutionText: text('resolution_text'),
	committeeId: varchar('committee_id', { length: 50 })
		.references(() => samfUsers.id)
		.notNull(),
	createdAt: datetime('created_at').default(new Date()).notNull(),
	resolvedAt: datetime('resolved_at'),
})

// 15. Recursos de Apelación
export const samfAppeals = mysqlTable('samf_appeals', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
	fileId: varchar('file_id', { length: 50 })
		.references(() => samfDisciplinaryFiles.id)
		.notNull(),
	appellantId: varchar('appellant_id', { length: 50 })
		.references(() => samfUsers.id)
		.notNull(),
	justification: text('justification').notNull(),
	status: mysqlEnum('status', ['PENDING', 'ACCEPTED', 'REJECTED']).default('PENDING').notNull(),
	resolutionText: text('resolution_text'),
	generalDirectorId: varchar('general_director_id', { length: 50 }).references(() => samfUsers.id),
	createdAt: datetime('created_at').default(new Date()).notNull(),
	resolvedAt: datetime('resolved_at'),
})

// 16. Transparencia y Sede Electrónica (Subidas de la SAMF)
export const samfTransparencyDocs = mysqlTable('samf_transparency_docs', {
	id: varchar('id', { length: 50 }).primaryKey().unique(),
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
	publishedAt: datetime('published_at').default(new Date()).notNull(),
})

// 17. Noticias Oficiales de la SAMF
export const samfNews = mysqlTable('samf_news', {
	id: varchar('id', { length: 50 }).primaryKey().unique(), // slug or uuid
	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	content: longtext('content').notNull(),
	image: varchar('image', { length: 255 }).default('/images/news_default.png').notNull(),
	category: varchar('category', { length: 100 }).default('Oficial').notNull(), // Oficial, Comunicado, Seguridad
	isMain: boolean('is_main').default(false).notNull(),
	createdAt: datetime('created_at').default(new Date()).notNull(),
	updatedAt: datetime('updated_at').default(new Date()).notNull(),
})

