// Bundle-size budget guard. Run with `npm run size` (builds, then checks).
// Fails (exit 1) if the built JS exceeds budget, so a change that quietly
// balloons the app — a heavy new dependency, a lost code-split — is caught
// before it ships. Budgets are GZIPPED KB (what a visitor actually downloads).
//
// Keyed on totals, not chunk names, because Vite's chunk names/splits shift
// between builds. If real growth is justified, raise the numbers here.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const DIR = 'dist/assets'
const BUDGET_TOTAL_JS_KB = 640   // all JS, gzipped (≈541 today → ~18% headroom)
const BUDGET_MAX_CHUNK_KB = 330  // any single JS chunk (the map engine, ≈277 today)

if (!existsSync(DIR)) {
  console.error(`No ${DIR}/ — run "npm run build" first.`)
  process.exit(1)
}

const gzKB = (buf) => Math.round(gzipSync(buf).length / 1024)
const rows = readdirSync(DIR)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({ f, kb: gzKB(readFileSync(`${DIR}/${f}`)) }))
  .sort((a, b) => b.kb - a.kb)

const total = rows.reduce((n, r) => n + r.kb, 0)
const biggest = rows[0] || { f: '(none)', kb: 0 }

console.log('Bundle (gzipped KB):')
for (const r of rows) console.log(`  ${String(r.kb).padStart(4)}  ${r.f}`)
console.log(`  ----\n  ${String(total).padStart(4)}  TOTAL JS`)

const problems = []
if (total > BUDGET_TOTAL_JS_KB) problems.push(`Total JS ${total}KB > budget ${BUDGET_TOTAL_JS_KB}KB`)
if (biggest.kb > BUDGET_MAX_CHUNK_KB) problems.push(`Largest chunk (${biggest.f}) ${biggest.kb}KB > budget ${BUDGET_MAX_CHUNK_KB}KB`)

if (problems.length) {
  console.error('\n✗ Bundle budget exceeded:\n  ' + problems.join('\n  ') +
    '\n  If the growth is justified, raise the budget in scripts/check-bundle-size.mjs.')
  process.exit(1)
}
console.log(`\n✓ Within budget (total ${total}/${BUDGET_TOTAL_JS_KB}KB, largest ${biggest.kb}/${BUDGET_MAX_CHUNK_KB}KB).`)
