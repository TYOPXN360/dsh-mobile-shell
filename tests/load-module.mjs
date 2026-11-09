/**
 * Test helper: load ONE client source module as a CommonJS module.
 *
 * The shipped `lib/client.js` is a single wrapped bundle, so a test cannot
 * reach an individual module inside it. Bundling the module on demand keeps the
 * tests pointed at the real source (no duplicated logic, no string surgery) and
 * still gives each test its own module instance.
 */
import { mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDirectory = join(root, '.test-build')

/** Resolve esbuild from the package name, then this package's own install. */
async function esbuild() {
  const candidates = [
    'esbuild',
    join(root, 'node_modules', 'esbuild', 'lib', 'main.js'),
  ]
  for (const candidate of candidates) {
    try {
      const module = await import(candidate)
      return module.default ?? module
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error('tests: esbuild is unavailable')
}

let counter = 0

/**
 * Bundle one source module to a throwaway CJS file and import it.
 * @param relative - path under `src/client/`, without extension.
 * @returns the module's exports.
 */
export async function loadModule(relative) {
  const build = await esbuild()
  counter += 1
  const outfile = join(cacheDirectory, `${relative.replaceAll('/', '-')}-${counter}.cjs`)
  await mkdir(cacheDirectory, { recursive: true })
  await build.build({
    entryPoints: [join(root, 'src', 'client', `${relative}.ts`)],
    bundle: true,
    write: true,
    outfile,
    format: 'cjs',
    platform: 'node',
    target: ['node22'],
    logLevel: 'silent',
    sourcemap: false,
  })
  const loaded = await import(pathToFileURL(outfile).href)
  return loaded
}

/** Remove the scratch directory (called once by the test process). */
export async function cleanup() {
  await rm(cacheDirectory, { recursive: true, force: true })
}
