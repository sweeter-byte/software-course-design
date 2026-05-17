import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const distDir = path.resolve(process.cwd(), 'dist')

mkdirSync(distDir, { recursive: true })
writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2),
  'utf8',
)
