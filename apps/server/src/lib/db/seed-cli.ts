import { seedDatabase } from './seed'

seedDatabase().catch((error) => {
  console.error(error)
  process.exit(1)
})
