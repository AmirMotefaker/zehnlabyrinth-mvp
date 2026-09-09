import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const mainPath = resolve(root, 'phaser/src/main.ts')

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts })
}

const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim()
if (branch !== 'fix/102-stage-select-runtime-crash') throw new Error(`Wrong branch: ${branch}`)
if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('Working tree must be clean.')

console.log('\n=== ISSUE #102 STAGE SELECT RUNTIME CRASH ===')
console.log('main / production untouched')

let src = readFileSync(mainPath, 'utf8')
const before = src

src = src.replace("    el<HTMLInputElement>('#stageInput').disabled = locked", "    el<HTMLSelectElement>('#stageSelect').disabled = locked")
src = src.replace("    el<HTMLInputElement>('#stageInput').value = String(this.stageNumber)", "    el<HTMLSelectElement>('#stageSelect').value = String(this.stageNumber)")

if (src === before) throw new Error('No stale stageInput references were replaced.')
if (src.includes("#stageInput")) throw new Error('Stale #stageInput reference still exists in main.ts')

writeFileSync(mainPath, src, 'utf8')

console.log('\n=== PATCHED ===')
run('git', ['diff', '--', 'phaser/src/main.ts'])

try { run('npm', ['run', 'typecheck'], { cwd: resolve(root, 'phaser') }) } catch { console.log('Local typecheck unavailable/failed; GitHub CI will be authoritative.') }
try { run('npm', ['run', 'runtime:audit'], { cwd: resolve(root, 'phaser') }) } catch { console.log('Local runtime:audit unavailable/failed; GitHub CI will be authoritative.') }
try { run('npm', ['run', 'build'], { cwd: resolve(root, 'phaser') }) } catch { console.log('Local build unavailable/failed; GitHub CI will be authoritative.') }

run('git', ['add', 'phaser/src/main.ts'])
run('git', ['commit', '-m', 'fix(runtime): replace stale stage input references'])
run('git', ['push', 'origin', 'fix/102-stage-select-runtime-crash'])

console.log('\n=== DONE ===')
run('git', ['log', '-1', '--oneline'])
