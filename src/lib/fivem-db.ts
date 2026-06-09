import { fivemDb, FiveMPlayers, FiveMVehicles, FiveMHouses } from '../../db/config'
import { eq } from 'drizzle-orm'
import type { FiveMPlayer } from '../types/Users'

// Get characters by Discord ID
export async function getCharactersByDiscord(discordId: string): Promise<FiveMPlayer[]> {
	try {
		// Check if database connection is available
		if (!fivemDb) {
			console.warn('FiveM database connection not available, returning empty characters list')
			return []
		}

		// Query to get all characters associated with a Discord ID
		const characters = await fivemDb
			.select()
			.from(FiveMPlayers)
			.where(eq(FiveMPlayers.discord, discordId))
			.orderBy(FiveMPlayers.id)
			.limit(10)
		return characters.map((row: any, index: number) => {
			// Parse the JSON fields safely - they might be strings or already parsed objects
			let charinfo, money, job, metadata

			try {
				charinfo = typeof row.charinfo === 'string' ? JSON.parse(row.charinfo) : row.charinfo || {}
			} catch {
				charinfo = {}
			}

			try {
				money =
					typeof row.money === 'string' ? JSON.parse(row.money) : row.money || { cash: 0, bank: 0 }
			} catch {
				money = { cash: 0, bank: 0 }
			}

			try {
				job =
					typeof row.job === 'string'
						? JSON.parse(row.job)
						: row.job || {
								name: 'unemployed',
								label: 'Desempleado',
								grade: 0,
								onduty: false,
							}
			} catch {
				job = { name: 'unemployed', label: 'Desempleado', grade: 0, onduty: false }
			}

			try {
				metadata =
					typeof row.metadata === 'string'
						? JSON.parse(row.metadata)
						: row.metadata || {
								health: 100,
								armor: 0,
								hunger: 100,
								thirst: 100,
							}
			} catch {
				metadata = { health: 100, armor: 0, hunger: 100, thirst: 100 }
			}

			// Generate character name from charinfo
			const name =
				charinfo?.firstname && charinfo?.lastname
					? `${charinfo.firstname} ${charinfo.lastname}`
					: row.name || `Personaje ${index + 1}`

			return {
				count: index + 1,
				id: row.id,
				cid: row.cid,
				discord: row.discord,
				license: row.license,
				citizenid: row.citizenid,
				name,
				charinfo,
				money,
				job,
				metadata,
				image: row.image,
			} as FiveMPlayer
		})
	} catch (error) {
		console.error('Error fetching characters from database:', error)
		return []
	}
}

// Get player statistics
export async function getPlayerStats(discordId: string) {
	try {
		// Check if database connection is available
		if (!fivemDb) {
			console.warn('FiveM database connection not available, returning default stats')
			return {
				total_characters: 0,
				total_cash: 0,
				total_bank: 0,
				total_lions: 0,
				last_login: null,
			}
		}

		// Get all characters for this Discord ID
		const characters = await fivemDb
			.select()
			.from(FiveMPlayers)
			.where(eq(FiveMPlayers.discord, discordId))
			.orderBy(FiveMPlayers.last_updated)

		// Calculate totals manually from the results
		let totalCash = 0
		let totalBank = 0
		let totalLions = 0
		const totalCharacters = characters.length
		characters.forEach((character: any) => {
			// Parse the money field safely
			let money
			try {
				money =
					typeof character.money === 'string'
						? JSON.parse(character.money)
						: character.money || { cash: 0, bank: 0, lions: 0 }
			} catch {
				money = { cash: 0, bank: 0, lions: 0 }
			}

			totalCash += Number(money.cash) || 0
			totalBank += Number(money.bank) || 0
			totalLions += Number(money.lions) || 0
		})

		// Get the most recent character update (assuming we have a last_updated field)
		// For now, we'll return null as we don't have this field in the schema
		const lastLogin = characters.length > 0 ? characters[characters.length - 1].last_updated : null

		return {
			total_characters: totalCharacters,
			total_cash: totalCash,
			total_bank: totalBank,
			total_lions: totalLions,
			last_login: lastLogin,
		}
	} catch (error) {
		console.error('Error fetching player stats:', error)
		return {
			total_characters: 0,
			total_cash: 0,
			total_bank: 0,
			total_lions: 0,
			last_login: null,
		}
	}
}

// Get player vehicles by citizenid
export async function getPlayerVehicles(citizenid: string) {
	try {
		if (!fivemDb) {
			console.warn('FiveM database connection not available, returning empty vehicles list')
			return []
		}

		const vehicles = await fivemDb
			.select()
			.from(FiveMVehicles)
			.where(eq(FiveMVehicles.citizenid, citizenid))

		return vehicles.map((vehicle: any) => {
			let mods
			try {
				mods = typeof vehicle.mods === 'string' ? JSON.parse(vehicle.mods) : vehicle.mods || {}
			} catch {
				mods = {}
			}
			return {
				id: vehicle.id,
				owner: vehicle.citizenid || vehicle.license, // Map license to owner
				citizenid: vehicle.citizenid,
				vehicle: vehicle.vehicle,
				hash: vehicle.hash,
				mods,
				plate: vehicle.plate,
				garage: vehicle.garage,
				state: vehicle.state,
				insurance: vehicle.insurance,
				insurance_expiration: vehicle.insurance_expiration,
			}
		})
	} catch (error) {
		console.error('Error fetching player vehicles:', error)
		return []
	}
}

// Get character details by citizenid
export async function getCharacterDetails(citizenid: string): Promise<FiveMPlayer | null> {
	try {
		if (!fivemDb) {
			console.warn('FiveM database connection not available')
			return null
		}

		const result = await fivemDb
			.select()
			.from(FiveMPlayers)
			.where(eq(FiveMPlayers.citizenid, citizenid))
			.limit(1)

		if (result.length === 0) {
			return null
		}

		const row = result[0]

		// Parse JSON fields safely
		let charinfo, money, job, metadata, inventory

		try {
			charinfo = typeof row.charinfo === 'string' ? JSON.parse(row.charinfo) : row.charinfo || {}
		} catch {
			charinfo = {}
		}

		try {
			money =
				typeof row.money === 'string' ? JSON.parse(row.money) : row.money || { cash: 0, bank: 0 }
		} catch {
			money = { cash: 0, bank: 0 }
		}

		try {
			job =
				typeof row.job === 'string'
					? JSON.parse(row.job)
					: row.job || {
							name: 'unemployed',
							label: 'Desempleado',
							grade: 0,
							onduty: false,
						}
		} catch {
			job = { name: 'unemployed', label: 'Desempleado', grade: 0, onduty: false }
		}

		try {
			metadata =
				typeof row.metadata === 'string'
					? JSON.parse(row.metadata)
					: row.metadata || {
							health: 100,
							armor: 0,
							hunger: 100,
							thirst: 100,
						}
		} catch {
			metadata = { health: 100, armor: 0, hunger: 100, thirst: 100 }
		}

		try {
			inventory =
				typeof row.inventory === 'string' ? JSON.parse(row.inventory) : row.inventory || []
		} catch {
			inventory = []
		}

		const name =
			charinfo?.firstname && charinfo?.lastname
				? `${charinfo.firstname} ${charinfo.lastname}`
				: row.name || 'Personaje Sin Nombre'

		return {
			count: 1,
			id: row.id,
			cid: row.cid,
			discord: row.discord,
			license: row.license,
			citizenid: row.citizenid,
			name,
			charinfo,
			money,
			job,
			metadata,
			inventory,
			image: row.image,
		} as FiveMPlayer
	} catch (error) {
		console.error('Error fetching character details:', error)
		return null
	}
}

// Get player houses by citizenid
export async function getPlayerHouses(citizenid: string) {
	try {
		if (!fivemDb) {
			console.warn('FiveM database connection not available, returning empty houses list')
			return []
		}

		const houses = await fivemDb.select().from(FiveMHouses).where(eq(FiveMHouses.owner, citizenid))

		return houses.map((house: any) => {
			let keyholders

			try {
				keyholders =
					typeof house.keyholders === 'string'
						? JSON.parse(house.keyholders)
						: house.keyholders || []

				if (keyholders.length === 1 && keyholders[0] === citizenid) {
					keyholders = [] // If the only keyholder is the owner, return an empty array
				}
			} catch {
				keyholders = []
			}

			return {
				id: house.id,
				house: house.house,
				identifier: house.owner || house.citizenid,
				citizenid: house.citizenid,
				keyholders,
			}
		})
	} catch (error) {
		console.error('Error fetching player houses:', error)
		return []
	}
}
