import Phaser from 'phaser'
import './style.css'
import {
  generateStage,
  getTracks,
  type AgeBand,
  type Difficulty,
  type Direction,
  type StageDefinition,
  type StageTile
} from './core/stage-engine'
import {
  applyPulse,
  createRuntimeState,
  type RuntimeState
} from './core/runtime-engine'

type Locale = 'fa' | 'en'
type Rotation = 0 | 1 | 2 | 3
type RotationMap = Record<string, Rotation>
type UndoEntry = { key: string; previous: Rotation }

const FA = '۰۱۲۳۴۵۶۷۸۹'
const DELTA: Record<Direction, { row: number; col: number }> = {
  N: { row: -1, col: 0 }, E: { row: 0, col: 1 }, S: { row: 1, col: 0 }, W: { row: 0, col: -1 }
}
const ARROW: Record<Direction, string> = { N: '↑', E: '→', S: '↓', W: '←' }

const copy = {
  fa: {
    tagline: 'هزارتوی ذهن · شبکهٔ نور', age: 'رده سنی', difficulty: 'سختی', chapter: 'فصل', stage: 'مرحله',
    load: 'بارگذاری', easy: 'ساده', medium: 'متوسط', hard: 'سخت', pulse: 'ارسال پالس', hint: 'راهنما −۲۵',
    undo: 'بازگشت', restart: 'شروع دوباره', next: 'مرحله بعد', ready: 'قطعه‌ها را بچرخان و مسیر نور را کامل کن.',
    rotated: 'قطعه چرخید؛ مسیر را دوباره بررسی کن.', sending: 'پالس در شبکه حرکت می‌کند…',
    failed: 'پالس متوقف شد؛ اتصال بعدی شبکه را اصلاح کن.', charging: 'پالس ثبت شد؛ شبکه برای پالس بعدی شارژ شد.',
    solved: 'عالی! ستاره روشن شد و مرحله کامل است.',
    hintDone: 'یک قطعهٔ مسیر اصلاح شد؛ ۲۵ امتیاز از پاداش کم می‌شود.', hintNone: 'چرخش مسیر درست است؛ پالس را ارسال کن.',
    noUndo: 'حرکتی برای بازگشت وجود ندارد.', phaseClosed: 'دروازه فاز هنوز بسته است؛ پالس بعدی را آماده کن.',
    relayOrder: 'رله‌ها باید به ترتیب صحیح فعال شوند.', relayMissing: 'همهٔ رله‌های لازم هنوز شارژ نشده‌اند.',
    locked: 'ابتدا مرحله فعلی را کامل کن تا مرحله بعد باز شود.',
    tutorial1: 'آموزش ۱ از ۳: از لوزی فیروزه‌ای شروع کن. قطعهٔ مشخص‌شده را لمس کن تا بچرخد و مسیر به سمت ستاره ساخته شود.',
    tutorial2: 'آموزش ۲ از ۳: علامت ↻ یعنی قطعه قابل چرخش است. مسیر روشن را از آغاز تا ستاره کامل کن.',
    tutorial3: 'آموزش ۳ از ۳: حالا مسیر را خودت کامل کن؛ اگر گیر کردی «راهنما» یک حرکت درست را نشان می‌دهد.',
    tutorialPulse: 'مسیر آماده است؛ حالا «ارسال پالس» را بزن تا نور از آغاز به ستاره برسد.'
  },
  en: {
    tagline: 'Mind Labyrinth · Living Light Network', age: 'Age', difficulty: 'Difficulty', chapter: 'Chapter', stage: 'Stage',
    load: 'Load', easy: 'Easy', medium: 'Medium', hard: 'Hard', pulse: 'Send pulse', hint: 'Hint −25',
    undo: 'Undo', restart: 'Restart', next: 'Next stage', ready: 'Rotate the nodes and complete the light path.',
    rotated: 'Node rotated. Re-check the route.', sending: 'Pulse travelling through the network…',
    failed: 'Pulse stopped. Repair the next network connection.', charging: 'Pulse stored. The network is charged for the next pulse.',
    solved: 'Great! The star is lit and the stage is complete.',
    hintDone: 'One route node was corrected. Hint penalty: 25.', hintNone: 'The route rotations are correct. Send the pulse.',
    noUndo: 'There is no move to undo.', phaseClosed: 'The phase gate is still closed. Prepare the next pulse.',
    relayOrder: 'Relays must be activated in the correct order.', relayMissing: 'Not all required relays are charged yet.',
    locked: 'Finish the current stage first to unlock the next one.',
    tutorial1: 'Tutorial 1 of 3: start at the cyan diamond. Tap the highlighted node to rotate it and build the route toward the star.',
    tutorial2: 'Tutorial 2 of 3: ↻ marks a rotatable node. Complete the lit route from start to star.',
    tutorial3: 'Tutorial 3 of 3: complete the route yourself. If you get stuck, Hint reveals one correct move.',
    tutorialPulse: 'The route is ready. Press “Send pulse” to carry the light from start to the star.'
  }
} as const

function el<T extends HTMLElement>(selector: string): T { return document.querySelector(selector) as T }
function keyOf(row: number, col: number) { return `${row}:${col}` }
function digits(value: number, locale: Locale) { return locale === 'fa' ? String(value).replace(/\d/g, d => FA[Number(d)]) : String(value) }

class NeyroScene extends Phaser.Scene {
  private locale: Locale = (localStorage.getItem('neyro.locale') as Locale) || 'fa'
  private ageBand: AgeBand = (localStorage.getItem('neyro.age') as AgeBand) || '5-8'
  private difficulty: Difficulty = (localStorage.getItem('neyro.difficulty') as Difficulty) || 'easy'
  private tutorialComplete = localStorage.getItem('neyro.tutorialComplete') === '1'
  private stageNumber = this.tutorialComplete ? Math.min(1000, Math.max(1, Number(localStorage.getItem('neyro.stage') || 1))) : 1
  private stage!: StageDefinition
  private runtime!: RuntimeState
  private rotations: RotationMap = {}
  private initialRotations: RotationMap = {}
  private undoStack: UndoEntry[] = []
  private moves = 0
  private hints = 0
  private pulseCount = 0
  private reached = new Set<string>()
  private solved = false
  private pulsing = false
  private board?: Phaser.GameObjects.Container

  constructor() { super('neyro') }

  create() {
    this.bindControls()
    this.scale.on('resize', () => this.drawBoard())
    this.loadStage(this.stageNumber)
  }

  private bindControls() {
    for (let chapter = 1; chapter <= 8; chapter += 1) {
      const option = document.createElement('option'); option.value = String(chapter); el<HTMLSelectElement>('#chapterSelect').append(option)
    }
    el<HTMLButtonElement>('#pulseButton').onclick = () => void this.sendPulse()
    el<HTMLButtonElement>('#hintButton').onclick = () => this.hint()
    el<HTMLButtonElement>('#undoButton').onclick = () => this.undo()
    el<HTMLButtonElement>('#restartButton').onclick = () => this.restart()
    el<HTMLButtonElement>('#nextButton').onclick = () => {
      if (!this.solved) { this.setStatus(copy[this.locale].locked); return }
      this.loadStage(Math.min(1000, this.stageNumber + 1))
    }
    el<HTMLButtonElement>('#loadButton').onclick = () => {
      if (this.pulsing) return
      this.ageBand = el<HTMLSelectElement>('#ageSelect').value as AgeBand
      this.difficulty = el<HTMLSelectElement>('#difficultySelect').value as Difficulty
      const requested = Math.min(1000, Math.max(1, Number(el<HTMLInputElement>('#stageInput').value) || 1))
      this.loadStage(Math.min(requested, this.highestUnlocked()))
    }
    el<HTMLSelectElement>('#chapterSelect').onchange = event => {
      if (this.pulsing) return
      const chapter = Number((event.target as HTMLSelectElement).value)
      const firstStage = (chapter - 1) * 125 + 1
      this.loadStage(Math.min(firstStage, this.highestUnlocked()))
    }
    el<HTMLButtonElement>('#localeButton').onclick = () => {
      this.locale = this.locale === 'fa' ? 'en' : 'fa'
      localStorage.setItem('neyro.locale', this.locale)
      this.applyLocale(); this.updateHud(); this.setStageInstruction(); this.drawBoard()
    }
  }

  private currentTrack() {
    return getTracks().find(track => track.ageBand === this.ageBand && track.difficulty === this.difficulty) ?? getTracks()[0]
  }

  private unlockKey() { return `neyro.unlocked.${this.currentTrack().id}` }
  private highestUnlocked() {
    if (!this.tutorialComplete) return Math.min(3, Math.max(1, Number(localStorage.getItem(this.unlockKey()) || 1)))
    return Math.min(1000, Math.max(1, Number(localStorage.getItem(this.unlockKey()) || 1)))
  }
  private unlockNext() {
    const next = Math.min(1000, this.stageNumber + 1)
    const current = this.highestUnlocked()
    if (next > current) localStorage.setItem(this.unlockKey(), String(next))
    if (this.stageNumber >= 3 && !this.tutorialComplete) {
      this.tutorialComplete = true
      localStorage.setItem('neyro.tutorialComplete', '1')
      if (Number(localStorage.getItem(this.unlockKey()) || 1) < 4) localStorage.setItem(this.unlockKey(), '4')
    }
  }

  private syncRuntimeRotations() {
    this.runtime = { ...this.runtime, rotations: { ...this.rotations }, reached: [], complete: false }
  }

  private loadStage(number: number) {
    if (this.pulsing) return
    const allowed = this.tutorialComplete ? this.highestUnlocked() : Math.min(3, this.highestUnlocked())
    this.stageNumber = Math.min(number, allowed)
    this.stage = generateStage(this.currentTrack(), this.stageNumber)
    this.moves = 0; this.hints = 0; this.pulseCount = 0; this.solved = false; this.reached.clear(); this.undoStack = []
    this.rotations = {}
    this.stage.grid.forEach((row, r) => row.forEach((tile, c) => {
      if (!this.isRotatable(tile)) return
      const span = tile.kind === 'straight' ? 2 : 4
      let rotation = ((tile.targetRotation + 1 + ((this.stage.seed + r * 17 + c * 31) % (span - 1 || 1))) % span) as Rotation
      if (tile.kind === 'straight') rotation = (rotation % 2) as Rotation
      this.rotations[keyOf(r, c)] = rotation
    }))
    this.initialRotations = { ...this.rotations }
    this.runtime = createRuntimeState(this.stage, this.rotations)
    localStorage.setItem('neyro.age', this.ageBand); localStorage.setItem('neyro.difficulty', this.difficulty); localStorage.setItem('neyro.stage', String(this.stageNumber))
    this.applyLocale(); this.setStageInstruction(); this.updateHud(); this.drawBoard(); this.updateNextState()
  }

  private setStageInstruction() {
    const c = copy[this.locale]
    if (!this.tutorialComplete && this.stageNumber === 1) this.setStatus(c.tutorial1)
    else if (!this.tutorialComplete && this.stageNumber === 2) this.setStatus(c.tutorial2)
    else if (!this.tutorialComplete && this.stageNumber === 3) this.setStatus(c.tutorial3)
    else this.setStatus(c.ready)
  }

  private tutorialTarget() {
    if (this.tutorialComplete || this.stageNumber > 3) return undefined
    return this.stage.solutionPath.slice(1, -1).find(point => {
      const tile = this.stage.grid[point.row][point.col]
      return this.isRotatable(tile) && this.rotationAt(point.row, point.col, tile) !== tile.targetRotation
    })
  }

  private routeReady() {
    return !this.stage.solutionPath.slice(1, -1).some(point => {
      const tile = this.stage.grid[point.row][point.col]
      return this.isRotatable(tile) && this.rotationAt(point.row, point.col, tile) !== tile.targetRotation
    })
  }

  private isRotatable(tile: StageTile) { return tile.kind === 'straight' || tile.kind === 'elbow' }
  private rotationAt(row: number, col: number, tile: StageTile): Rotation { return this.rotations[keyOf(row, col)] ?? tile.targetRotation }

  private ports(tile: StageTile, rotation: Rotation): Direction[] {
    if (tile.kind === 'empty' || tile.kind === 'blocker') return []
    if (tile.kind === 'relay') return ['N', 'E', 'S', 'W']
    if (tile.kind === 'phase') return this.pulseCount >= this.stage.requiredPulses - 1 ? ['N', 'E', 'S', 'W'] : []
    if (tile.kind === 'straight') return rotation % 2 === 0 ? ['E', 'W'] : ['N', 'S']
    if (tile.kind === 'elbow') return ([['N', 'E'], ['E', 'S'], ['S', 'W'], ['W', 'N']][rotation] ?? []) as Direction[]
    return []
  }

  private setInteractionLocked(locked: boolean) {
    this.pulsing = locked
    for (const id of ['pulseButton', 'hintButton', 'undoButton', 'restartButton', 'loadButton']) {
      el<HTMLButtonElement>(`#${id}`).disabled = locked
    }
    el<HTMLSelectElement>('#ageSelect').disabled = locked
    el<HTMLSelectElement>('#difficultySelect').disabled = locked
    el<HTMLSelectElement>('#chapterSelect').disabled = locked
    el<HTMLInputElement>('#stageInput').disabled = locked
    this.updateNextState()
  }

  private updateNextState() {
    el<HTMLButtonElement>('#nextButton').disabled = this.pulsing || !this.solved || this.stageNumber >= 1000
  }

  private async animatePulse(order: { row: number; col: number }[]) {
    this.reached.clear(); this.drawBoard()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = reduceMotion ? 0 : 90
    for (const point of order) {
      this.reached.add(keyOf(point.row, point.col))
      this.drawBoard()
      if (delay > 0) await new Promise<void>(resolve => this.time.delayedCall(delay, () => resolve()))
    }
  }

  private async sendPulse() {
    if (this.solved || this.pulsing) return
    this.setInteractionLocked(true)
    this.syncRuntimeRotations()
    this.setStatus(copy[this.locale].sending)
    const result = applyPulse(this.stage, this.runtime)
    this.runtime = result.state
    this.pulseCount = this.runtime.pulseIndex
    this.updateHud()
    const order = result.reached.map(key => {
      const [row, col] = key.split(':').map(Number)
      return { row, col }
    })
    await this.animatePulse(order)

    if (result.complete) {
      this.solved = true
      const bestKey = `neyro.best.${this.stage.id}`
      const score = Math.max(0, 1000 - this.moves * 12 - this.hints * 25 - (this.pulseCount - this.stage.requiredPulses) * 20)
      const previous = Number(localStorage.getItem(bestKey) || 0); if (score > previous) localStorage.setItem(bestKey, String(score))
      localStorage.setItem(`neyro.complete.${this.stage.id}`, '1')
      this.unlockNext()
      this.setStatus(copy[this.locale].solved)
    } else if (result.failure === 'phase-closed') {
      this.setStatus(copy[this.locale].phaseClosed)
    } else if (result.failure === 'relay-order') {
      this.setStatus(copy[this.locale].relayOrder)
    } else if (result.failure === 'relay-missing') {
      this.setStatus(copy[this.locale].relayMissing)
    } else if (result.goalReached) {
      this.setStatus(copy[this.locale].charging)
    } else {
      const nodeNumber = Math.max(1, order.length)
      const detail = this.locale === 'fa' ? ` گره ${digits(nodeNumber, this.locale)} آخرین نقطه روشن بود.` : ` Node ${nodeNumber} was the last lit point.`
      this.setStatus(copy[this.locale].failed + detail)
    }
    this.updateHud(); this.drawBoard(); this.setInteractionLocked(false); this.updateNextState()
  }

  private rotate(row: number, col: number) {
    if (this.solved || this.pulsing) return
    const tile = this.stage.grid[row][col]; if (!this.isRotatable(tile)) return
    const key = keyOf(row, col); const previous = this.rotationAt(row, col, tile)
    this.undoStack.push({ key, previous })
    const span = tile.kind === 'straight' ? 2 : 4
    this.rotations[key] = ((previous + 1) % span) as Rotation
    this.syncRuntimeRotations()
    this.moves += 1; this.reached.clear()
    this.setStatus(this.routeReady() && !this.tutorialComplete && this.stageNumber <= 3 ? copy[this.locale].tutorialPulse : copy[this.locale].rotated)
    this.updateHud(); this.drawBoard()
  }

  private hint() {
    if (this.pulsing) return
    const target = this.stage.solutionPath.slice(1, -1).find(point => {
      const tile = this.stage.grid[point.row][point.col]
      return this.isRotatable(tile) && this.rotationAt(point.row, point.col, tile) !== tile.targetRotation
    })
    if (!target) { this.setStatus(copy[this.locale].hintNone); return }
    const tile = this.stage.grid[target.row][target.col]; const key = keyOf(target.row, target.col)
    this.undoStack.push({ key, previous: this.rotationAt(target.row, target.col, tile) })
    this.rotations[key] = tile.targetRotation; this.syncRuntimeRotations(); this.moves += 1; this.hints += 1; this.reached.clear()
    this.setStatus(this.routeReady() && !this.tutorialComplete && this.stageNumber <= 3 ? copy[this.locale].tutorialPulse : copy[this.locale].hintDone)
    this.updateHud(); this.drawBoard()
  }

  private undo() {
    if (this.pulsing) return
    const action = this.undoStack.pop(); if (!action) { this.setStatus(copy[this.locale].noUndo); return }
    this.rotations[action.key] = action.previous; this.syncRuntimeRotations(); this.moves = Math.max(0, this.moves - 1); this.reached.clear(); this.solved = false
    this.updateHud(); this.drawBoard(); this.updateNextState()
  }

  private restart() {
    if (this.pulsing) return
    this.rotations = { ...this.initialRotations }; this.undoStack = []; this.moves = 0; this.hints = 0; this.pulseCount = 0; this.solved = false; this.reached.clear()
    this.runtime = createRuntimeState(this.stage, this.rotations)
    this.setStageInstruction(); this.updateHud(); this.drawBoard(); this.updateNextState()
  }

  private applyLocale() {
    const c = copy[this.locale]; document.documentElement.lang = this.locale; document.documentElement.dir = this.locale === 'fa' ? 'rtl' : 'ltr'
    el('#tagline').textContent = c.tagline; el('#ageText').textContent = c.age; el('#difficultyText').textContent = c.difficulty; el('#chapterText').textContent = c.chapter; el('#stageText').textContent = c.stage
    el<HTMLButtonElement>('#loadButton').textContent = c.load; el<HTMLButtonElement>('#pulseButton').textContent = c.pulse; el<HTMLButtonElement>('#hintButton').textContent = c.hint
    el<HTMLButtonElement>('#undoButton').textContent = c.undo; el<HTMLButtonElement>('#restartButton').textContent = c.restart; el<HTMLButtonElement>('#nextButton').textContent = c.next
    el<HTMLButtonElement>('#localeButton').textContent = this.locale === 'fa' ? 'EN' : 'فا'
    const difficulty = el<HTMLSelectElement>('#difficultySelect').options; difficulty[0].text = c.easy; difficulty[1].text = c.medium; difficulty[2].text = c.hard
    for (let i = 0; i < 8; i += 1) el<HTMLSelectElement>('#chapterSelect').options[i].text = `${c.chapter} ${digits(i + 1, this.locale)}`
    el<HTMLSelectElement>('#ageSelect').value = this.ageBand; el<HTMLSelectElement>('#difficultySelect').value = this.difficulty
    el<HTMLInputElement>('#stageInput').value = String(this.stageNumber); el<HTMLSelectElement>('#chapterSelect').value = String(this.stage?.chapter ?? 1)
  }

  private setStatus(message: string) { el('#statusLabel').textContent = message }

  private updateHud() {
    const c = copy[this.locale]
    el('#stageLabel').textContent = `${c.stage} ${digits(this.stageNumber, this.locale)} · ${c.chapter} ${digits(this.stage?.chapter ?? 1, this.locale)}`
    el('#movesLabel').textContent = this.locale === 'fa' ? `حرکت: ${digits(this.moves, this.locale)}` : `Moves: ${this.moves}`
    el('#pulseLabel').textContent = this.locale === 'fa' ? `پالس: ${digits(this.pulseCount, this.locale)}/${digits(this.stage?.requiredPulses ?? 1, this.locale)}` : `Pulse: ${this.pulseCount}/${this.stage?.requiredPulses ?? 1}`
  }

  private drawBoard() {
    if (!this.stage) return
    this.board?.destroy(true); this.board = this.add.container(0, 0)
    const w = this.scale.width, h = this.scale.height, n = this.stage.track.boardSize
    const size = Math.min(w * .92, h * .9, 720), step = size / n, left = (w - size) / 2, top = (h - size) / 2
    const panel = this.add.graphics(); panel.fillStyle(0x091529, 1); panel.lineStyle(2, 0x29466c, 1); panel.fillRoundedRect(left - 12, top - 12, size + 24, size + 24, 24); panel.strokeRoundedRect(left - 12, top - 12, size + 24, size + 24, 24); this.board.add(panel)
    const tutorial = !this.tutorialComplete && this.stageNumber <= 3
    const target = this.tutorialTarget()
    const targetKey = target ? keyOf(target.row, target.col) : undefined

    this.stage.grid.forEach((row, r) => row.forEach((tile, c) => {
      const x = left + step * (c + .5), y = top + step * (r + .5), cell = Math.max(28, step - 7)
      const key = keyOf(r, c); const reached = this.reached.has(key); const onPath = this.stage.solutionPath.some(p => p.row === r && p.col === c)
      const chargedRelay = tile.kind === 'relay' && this.runtime?.chargedRelays.includes(key)
      const chargedMirror = tile.mechanic === 'charged-mirror' && this.runtime?.chargedMirrors.includes(key)
      const tutorialDim = tutorial && this.stageNumber <= 2 && !onPath
      const fill = tile.kind === 'blocker' ? 0x171e2d : tile.kind === 'empty' ? 0x0b1727 : reached ? 0x123b3a : chargedRelay || chargedMirror ? 0x243553 : 0x11243c
      const g = this.add.graphics(); g.setAlpha(tutorialDim ? .18 : 1); g.fillStyle(fill, 1)
      const isTarget = targetKey === key
      g.lineStyle(isTarget ? 4 : reached ? 3 : chargedRelay || chargedMirror ? 3 : 1, isTarget ? 0xffd66b : reached ? 0x5ee0c1 : chargedRelay || chargedMirror ? 0xffd66b : onPath ? 0x355a76 : 0x20384f, 1)
      g.fillRoundedRect(x - cell / 2, y - cell / 2, cell, cell, Math.min(12, cell * .16)); g.strokeRoundedRect(x - cell / 2, y - cell / 2, cell, cell, Math.min(12, cell * .16)); this.board!.add(g)
      if (tile.kind === 'start' || tile.kind === 'goal') {
        const color = tile.kind === 'start' ? 0x5ee0c1 : 0xffd66b; const node = this.add.graphics(); node.fillStyle(0x0b1727, 1); node.lineStyle(4, color, 1); node.fillCircle(x, y, cell * .24); node.strokeCircle(x, y, cell * .24); this.board!.add(node)
        const text = this.add.text(x, y, tile.kind === 'start' ? '◆' : '★', { fontFamily: 'system-ui', fontSize: `${Math.max(13, cell * .24)}px`, color: tile.kind === 'start' ? '#5ee0c1' : '#ffd66b', fontStyle: 'bold' }).setOrigin(.5); this.board!.add(text)
        if (tile.kind === 'start') {
          const d = DELTA[this.stage.startDirection]
          const arrow = this.add.text(x + d.col * cell * .38, y + d.row * cell * .38, ARROW[this.stage.startDirection], { fontFamily: 'system-ui', fontSize: `${Math.max(16, cell * .28)}px`, color: '#5ee0c1', fontStyle: 'bold' }).setOrigin(.5)
          this.board!.add(arrow)
        }
        return
      }
      if (tile.kind === 'blocker') { const xg = this.add.graphics(); xg.setAlpha(tutorialDim ? .18 : 1); xg.lineStyle(5, 0x6b7891, 1); xg.beginPath(); xg.moveTo(x-cell*.2,y-cell*.2); xg.lineTo(x+cell*.2,y+cell*.2); xg.moveTo(x+cell*.2,y-cell*.2); xg.lineTo(x-cell*.2,y+cell*.2); xg.strokePath(); this.board!.add(xg); return }
      if (tile.kind === 'empty') return
      const rotation = this.rotationAt(r, c, tile); const pipe = this.add.graphics(); pipe.setAlpha(tutorialDim ? .18 : 1); pipe.lineStyle(Math.max(5, cell * .1), reached ? 0xffd66b : tile.mechanic === 'decoy' ? 0x537998 : 0x88b9db, 1)
      const len = cell * .38
      if (tile.kind === 'relay' || tile.kind === 'phase') {
        pipe.beginPath(); pipe.moveTo(x-len,y); pipe.lineTo(x+len,y); pipe.moveTo(x,y-len); pipe.lineTo(x,y+len); pipe.strokePath(); pipe.fillStyle(tile.kind === 'phase' ? 0x9278ff : chargedRelay ? 0xffd66b : 0x5ee0c1,1); pipe.fillCircle(x,y,Math.max(5,cell*.09))
      } else {
        const ports = this.ports(tile, rotation); pipe.beginPath(); for (const direction of ports) { const d = DELTA[direction]; pipe.moveTo(x,y); pipe.lineTo(x+d.col*len,y+d.row*len) } pipe.strokePath()
      }
      this.board!.add(pipe)
      if (this.isRotatable(tile)) {
        const rotateCue = this.add.text(x + cell * .27, y - cell * .27, '↻', { fontFamily: 'system-ui', fontSize: `${Math.max(12, cell * .18)}px`, color: isTarget ? '#ffd66b' : '#7fa9c8', fontStyle: 'bold' }).setOrigin(.5).setAlpha(tutorialDim ? .18 : .9)
        this.board!.add(rotateCue)
      }
      if (this.isRotatable(tile) && !this.pulsing && !tutorialDim) {
        const hit = this.add.zone(x, y, cell, cell).setInteractive({ useHandCursor: true }); hit.on('pointerdown', () => this.rotate(r,c)); this.board!.add(hit)
      }
    }))
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#07101c',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: NeyroScene,
  render: { antialias: true, pixelArt: false }
})

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined))