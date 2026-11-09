/**
 * Build the host half and publish the runtime files the service worker needs.
 *
 * The host half is plain TypeScript compiled to ESM (Node loads
 * `lib/index.js` directly). Two things this script adds on top of `tsc`:
 *
 * 1. **It copies the service worker** from `src/pwa/service-worker.js` to
 *    `lib/pwa/service-worker.js`. The worker is shipped as source (it must stay
 *    a classic script, and hand-minifying it would only invite a subtle bug),
 *    so it is not part of the TypeScript program and `tsc` never emits it.
 * 2. **It copies `assets/`** into `lib/` only when `lib/assets` is missing —
 *    the plugin resolves icons relative to `lib/`, so an installed tarball must
 *    carry them there. The copies are byte-identical by design.
 */
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))

/** Files that must exist in `lib/` for the plugin to work when installed. */
const REQUIRED = [
  'lib/index.js',
  'lib/routes.js',
  'lib/pwa/manifest.js',
  'lib/pwa/service-worker.js',
]

/** Compile the host half with tsc. */
async function compile() {
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
  const result = spawnSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.build.json')], {
    cwd: root,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
    throw new Error(`build-host: type check emitted errors\n${output}`)
  }
}

/** Copy the classic-script worker into the emitted tree. */
async function copyWorker() {
  const source = join(root, 'src', 'pwa', 'service-worker.js')
  const target = join(root, 'lib', 'pwa', 'service-worker.js')
  await mkdir(dirname(target), { recursive: true })
  const text = await readFile(source, 'utf8')
  // Parse it: a syntax error in the worker is invisible until a phone tries to
  // install the app, which is the worst possible place to find it.
  try {
    new vm.Script(text, { filename: 'service-worker.js' })
  } catch (error) {
    throw new Error(`build-host: service worker does not parse: ${error.message}`)
  }
  await writeFile(target, text, 'utf8')
}

/** Copy `assets/` next to the runtime half so icon reads resolve. */
async function copyAssets() {
  await cp(join(root, 'assets'), join(root, 'lib', 'assets'), { recursive: true })
}

/**
 * The plugin resolves icons from `lib/../assets` at runtime; make sure the
 * resolved directory really holds every icon the manifest advertises.
 */
async function verifyAssets() {
  const dir = join(root, 'assets')
  const files = new Set(await readdir(dir))
  const required = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']
  const missing = required.filter((name) => !files.has(name))
  if (missing.length > 0) throw new Error(`build-host: missing icons: ${missing.join(', ')}`)
}

/** Fail loudly when an expected artifact is absent or empty. */
async function verifyOutput() {
  const missing = []
  for (const relative of REQUIRED) {
    try {
      const info = await stat(join(root, relative))
      if (!info.isFile() || info.size === 0) missing.push(relative)
    } catch {
      missing.push(relative)
    }
  }
  if (missing.length > 0) throw new Error(`build-host: missing artifacts: ${missing.join(', ')}`)
}

await compile()
await copyWorker()
await verifyAssets()
await copyAssets()
await verifyOutput()
console.log('build-host: lib/ is complete')
