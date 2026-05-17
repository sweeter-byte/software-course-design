import { buildApp } from './app'
import { DEFAULT_SERVER_PORT } from '../../../packages/config/src/index'

async function start() {
  const app = await buildApp()

  try {
    await app.listen({
      port: DEFAULT_SERVER_PORT,
      host: '0.0.0.0',
    })
  } catch (error) {
    app.log.error(error)
    process.exitCode = 1
  }
}

start()
