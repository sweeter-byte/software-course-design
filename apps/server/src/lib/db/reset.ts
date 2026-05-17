import { rmSync } from 'node:fs'

import { resolveAppConfig } from '../config'

const config = resolveAppConfig()

if (config.databasePath !== ':memory:') {
  rmSync(config.databasePath, { force: true })
}
