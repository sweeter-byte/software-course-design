import { createDatabase } from './client'
import { resolveAppConfig } from '../config'

async function resetDatabase() {
  const config = resolveAppConfig()
  const database = await createDatabase(config.databaseConfig, { reset: true })
  await database.close()
}

resetDatabase().catch((error) => {
  console.error(error)
  process.exit(1)
})
