import { defineConfig } from 'drizzle-kit'
import process from 'node:process'

// Load environment variables from .env file natively in Node 20.6+
if (typeof process.loadEnvFile === 'function') {
	process.loadEnvFile()
}

export default defineConfig({
	schema: './db/schema.ts',
	out: './drizzle',
	dialect: 'mysql',
	dbCredentials: {
		host: process.env.DATABASE_HOST || '',
		user: process.env.DATABASE_USERNAME || '',
		password: process.env.DATABASE_PASSWORD || '',
		database: process.env.DATABASE_NAME || '',
	},
})
