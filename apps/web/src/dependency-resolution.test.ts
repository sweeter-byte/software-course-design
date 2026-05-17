import { createRequire } from 'node:module'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import viteConfig from '../vite.config'

describe('web react dependency resolution', () => {
  it('uses a single react instance for app code and root-level dependencies', () => {
    const appRequire = createRequire(new URL('../package.json', import.meta.url))
    const reactQueryPackagePath = appRequire.resolve('@tanstack/react-query/package.json')
    const reactQueryRequire = createRequire(reactQueryPackagePath)

    const appReactPath = appRequire.resolve('react/package.json')
    const reactQueryReactPath = reactQueryRequire.resolve('react/package.json')
    const aliasOptions = viteConfig.resolve?.alias
    const reactAliasPath =
      aliasOptions && !Array.isArray(aliasOptions)
        ? (aliasOptions as Record<string, string>).react
        : undefined

    expect(
      reactQueryReactPath === appReactPath || reactAliasPath === path.dirname(appReactPath),
    ).toBe(true)
  })
})
