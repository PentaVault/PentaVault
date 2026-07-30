#!/usr/bin/env node
/**
 * Fails when the frontend and backend commit-type lists disagree.
 *
 * The two repositories have separate commitlint configs because they are
 * separate git repositories. Nothing stops them drifting apart, and when they
 * do the symptom is confusing: the same message is accepted in one tree and
 * rejected in the other, usually discovered halfway through a series of
 * commits. This check turns that into a build failure instead.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

const frontendConfigPath = join(repoRoot, 'commitlint.config.js')
const backendConfigPath = join(repoRoot, 'PentaVault-Backend', '.commitlintrc.json')

function fail(message) {
  console.error(`commitlint parity: ${message}`)
  process.exit(1)
}

/** Reads the type list out of a config, whatever shape the rule value takes. */
function readTypes(rules, label) {
  const rule = rules?.['type-enum']
  if (!Array.isArray(rule)) {
    fail(`${label} does not set an explicit type-enum, so it silently inherits config-conventional`)
  }
  const types = rule[2]
  if (!Array.isArray(types)) {
    fail(`${label} has a type-enum without a list of types`)
  }
  return types
}

const frontend = require(frontendConfigPath)
const frontendTypes = readTypes(frontend.rules, 'commitlint.config.js')

// The backend is a submodule, so in a shallow CI checkout it may not be present.
// Its absence must not fail the build, but it must also not skip the rest of the
// check — the documentation comparison below works either way.
let backend = null
try {
  backend = JSON.parse(readFileSync(backendConfigPath, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error
  }
  console.log('commitlint parity: backend submodule not checked out, comparing docs only')
}

if (backend) {
  const backendTypes = readTypes(backend.rules, 'PentaVault-Backend/.commitlintrc.json')
  const onlyFrontend = frontendTypes.filter((type) => !backendTypes.includes(type))
  const onlyBackend = backendTypes.filter((type) => !frontendTypes.includes(type))

  if (onlyFrontend.length > 0 || onlyBackend.length > 0) {
    if (onlyFrontend.length > 0) {
      console.error(`commitlint parity: accepted only by the frontend: ${onlyFrontend.join(', ')}`)
    }
    if (onlyBackend.length > 0) {
      console.error(`commitlint parity: accepted only by the backend: ${onlyBackend.join(', ')}`)
    }
    fail('the two repositories must accept the same commit types — update both, and CLAUDE.md')
  }
}

// The documented list is what a contributor actually reads, so it has to match too.
const claudeMd = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8')
const documented = [
  ...claudeMd.matchAll(
    /`(feat|fix|perf|security|refactor|style|test|docs|chore|deps|build|ci|revert)`/g
  ),
].map((match) => match[1])
const undocumented = frontendTypes.filter((type) => !documented.includes(type))
if (undocumented.length > 0) {
  fail(`CLAUDE.md does not list these accepted types: ${undocumented.join(', ')}`)
}

console.log(`commitlint parity: ${frontendTypes.length} types agree across both repositories`)
