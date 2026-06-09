import { mysqlTable, text, datetime, int, varchar, json, longtext } from 'drizzle-orm/mysql-core'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

async function TryConnection(connection_data: mysql.PoolOptions) {
	try {
		const pool = mysql.createPool(connection_data)
		const dr = drizzle(pool)
		if (!dr) {
			console.log('Error conectándose a la BDD')
		}
		return dr
	} catch (error) {
		console.log('Error conectándose a la BDD')
		console.error(error)
		return null
	}
}

export const db = await TryConnection({
	host: (import.meta.env.DATABASE_HOST as string) ?? '',
	user: (import.meta.env.DATABASE_USERNAME as string) ?? '',
	password: (import.meta.env.DATABASE_PASSWORD as string) ?? '',
	database: (import.meta.env.DATABASE_NAME as string) ?? '',
	connectionLimit: 10,
})

export const fivemDb = await TryConnection({
	host: (import.meta.env.FIVEM_DATABASE_HOST as string) ?? '',
	user: (import.meta.env.FIVEM_DATABASE_USERNAME as string) ?? '',
	password: (import.meta.env.FIVEM_DATABASE_PASSWORD as string) ?? '',
	database: (import.meta.env.FIVEM_DATABASE_NAME as string) ?? '',
	connectionLimit: 10,
})

export const FiveMPlayers = mysqlTable('players', {
	id: int('id').primaryKey().unique(),
	citizenid: text('citizenid').notNull(),
	cid: int('cid').notNull(),
	license: text('license').notNull(),
	discord: text('discord').notNull(),
	name: text('name').notNull(),
	money: json('money').notNull(),
	charinfo: json('charinfo').notNull(),
	job: json('job').notNull(),
	metadata: json('metadata').notNull(),
	inventory: json('inventory').notNull(),
	image: longtext('image'),
	last_updated: datetime('last_updated', { mode: 'date' }).default(new Date()),
})

export const FiveMVehicles = mysqlTable('player_vehicles', {
	id: int('id').primaryKey().unique(),
	license: text('license').notNull(),
	citizenid: text('citizenid').notNull(),
	vehicle: text('vehicle').notNull(),
	hash: text('hash'),
	mods: json('mods'),
	plate: text('plate'),
	garage: text('garage'),
	state: int('state'),
	insurance: text('insurance'),
	insurance_expiration: datetime('insurance_expiration', { mode: 'date' }),
})

export const FiveMHouses = mysqlTable('player_houses', {
	id: int('id').primaryKey().unique(),
	house: text('house').notNull(),
	citizenid: varchar('citizenid', { length: 50 }).notNull(),
	keyholders: json('keyholders'),
	owner: varchar('owner', { length: 50 }).notNull(),
})

export const Passports = mysqlTable('FiveMPassports', {
	id: varchar('id', { length: 10 }).primaryKey().unique(),
	userId: text('user_id').notNull(), // Discord ID del usuario que creó el pasaporte
	firstname: varchar('firstname', { length: 100 }).notNull(),
	lastname: varchar('lastname', { length: 100 }).notNull(),
	dob: datetime('dob', { mode: 'date' }).notNull(),
	race: varchar('race', { length: 50 }).notNull(),
	gender: varchar('gender', { length: 20 }).notNull(), // MALE, FEMALE, OTHER
	birthPlace: varchar('birth_place', { length: 255 }).notNull(),
	height: int('height').notNull(), // en cm
	weight: int('weight').notNull(), // en kg
	family: longtext('family'),
	physicalAppearance: longtext('physical_appearance'),
	personality: longtext('personality'),
	studiesWork: longtext('studies_work'),
	fears: longtext('fears'),
	hobbies: longtext('hobbies'),
	goodBad: longtext('good_bad'),
	criminalRecord: longtext('criminal_record'),
	medicHistory: longtext('medic_history'),
	history: longtext('history').notNull(),
	status: varchar('status', { length: 20 }).default('PENDING'), // APPROVED, REJECTED, PENDING, CK
	createdAt: datetime('created_at', { mode: 'date' }).default(new Date()),
	updatedAt: datetime('updated_at', { mode: 'date' }).default(new Date()),
})

export * from './schema'

