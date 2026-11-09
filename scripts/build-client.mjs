/**
 * Build the browser half into the host loader's expected shape.
 *
 * Three steps, and the middle one is the reason this script exists:
 *
 * 1. **Type-check** the whole program (type errors fail the build; the client
 *    bundle is the only artifact a user sees, so it must never ship typed-wrong).
 * 2. **Bundle** `src/client/index.tsx` with esbuild into ONE CommonJS file, with
 *    `react` / `react-dom` / `react/jsx-runtime` left external — the host's
 *    browser module table provides those, and bundling a second React is the
 *    classic white-screen bug.
 * 3. **Wrap** the bundle in `window.__ModuleLoader__.load({ id, factory })`, the
 *    contract the host's client-modules kernel implements: `factory(require)`
 *    receives a `require` that resolves externals from the module table.
 *
 * Guardrails, because a broken bundle shows the user a white page:
 * - the assembled program is parsed with `new vm.Script` before it is written,
 *   so a syntax error fails here rather than in the browser;
 * - every external module the bundle still references is asserted to be one the
 *   host actually provides (a stray `require('node:fs')` is a build error);
 * - the output is written atomically (temp file + rename), so a watcher never
 *   reads a half-written bundle.
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const entry = join(root, 'src', 'client', 'index.tsx')
const outputPath = join(root, 'lib', 'client.js')
const tempPath = join(root, 'lib', 'client.js.tmp')

/**
 * Modules the host's browser module table resolves. Anything else a bundle
 * reaches for would throw at import time in the browser.
 */
const HOST_PROVIDED = new Set([
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
])

/** Locate esbuild: the package name first, then this package's own install. */
async function loadEsbuild() {
  const candidates = [
    'esbuild',
    join(root, 'node_modules', 'esbuild', 'lib', 'main.js'),
  ]
  const failures = []
  for (const candidate of candidates) {
    try {
      const module = await import(candidate)
      return module.default ?? module
    } catch (error) {
      failures.push(`${candidate}: ${error.message}`)
    }
  }
  throw new Error(`build-client: esbuild is unavailable\n  ${failures.join('\n  ')}`)
}

/** Type-check the program; a type error must stop the build. */
async function typecheck() {
  const { spawnSync } = await import('node:child_process')
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc')
  const result = spawnSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.json')], {
    cwd: root,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
    throw new Error(`build-client: type check failed\n${output}`)
  }
}

/**
 * Every bare `require("x")` in the bundle, ignoring relative ids and the ones
 * esbuild's own runtime introduces (`__require` wrappers still surface as
 * plain requires, which is what we want to validate).
 * @param code - the bundled program.
 * @returns the external specifiers it references.
 */
function externalRequires(code) {
  const found = new Set()
  const pattern = /require\(\s*(["'])([^"']+)\1\s*\)/g
  for (const match of code.matchAll(pattern)) {
    const specifier = match[2]
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) found.add(specifier)
  }
  return found
}

/**
 * Wrap a CommonJS bundle in the host loader's registration call.
 * @param code - the bundled program.
 * @returns the module-table program.
 */
function wrapForLoader(code) {
  return `window.__ModuleLoader__.load({
	id: "dsh-mobile-shell",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		(function (module, exports, require) {
${code}
		})(module, exports, require);
		return module.exports;
	}
});
`
}

/** Build, validate, and write the browser bundle. */
async function build() {
  await typecheck()

  const esbuild = await loadEsbuild()
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'browser',
    target: ['chrome110', 'safari16', 'firefox110'],
    jsx: 'automatic',
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'silent',
    external: [...HOST_PROVIDED],
    define: { 'process.env.NODE_ENV': '"production"' },
  })

  const compiled = result.outputFiles?.[0]?.text
  if (typeof compiled !== 'string' || compiled === '') {
    throw new Error('build-client: esbuild produced no output')
  }

  const unexpected = [...externalRequires(compiled)].filter((name) => !HOST_PROVIDED.has(name))
  if (unexpected.length > 0) {
    throw new Error(
      `build-client: the bundle requires modules the host does not provide: ${unexpected.join(', ')}`,
    )
  }

  const program = wrapForLoader(compiled)
  // Parse before writing: a syntax error here is a build failure, not a white page.
  try {
    new vm.Script(program, { filename: 'client.js' })
  } catch (error) {
    throw new Error(`build-client: assembled program does not parse: ${error.message}`)
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(tempPath, program, 'utf8')
  await rename(tempPath, outputPath)
  return program.length
}

const size = await build().catch(async (error) => {
  await rm(tempPath, { force: true }).catch(() => {})
  console.error(error.message)
  process.exitCode = 1
  return 0
})

if (size > 0) {
  const bytes = (await readFile(outputPath)).byteLength
  console.log(`build-client: wrote lib/client.js (${bytes} bytes)`)
}
