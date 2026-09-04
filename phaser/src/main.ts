import Phaser from 'phaser'
import './style.css'
import {
  generateStage,
  getTracks,
  type AgeBand,
  type Difficulty,
  type Direction,
  type Point,
  type StageDefinition,
  type StageTile
} from './core/stage-engine'

type Locale = 'fa' | 'en'
type Rotation = 0 | 1 | 2 | 3
type RotationMap = Record<string, Rotation>
type UndoEntry = { key: string; previous: Rotation }
type PulseTrace = { connected: boolean; order: Point[]; endpoint: Point }

const FA = '۰۱۲۳۴۵۶۷۸۹'
const OPPOSITE: Record<Direction, Direction> = { N: 'S', E: 'W', S: 'N', W: 'E' }
const DELTA: Record<Direction, Point> = {
  N: { row: -1, col: 0 }, E: { row: 0, col: 1 }, S: { row: 1, col: 0 }, W: { row: 0, col: -1 }
}

const copy = {
  fa: {
    tagline: 'هزارتوی ذهن · شبکهٔ نور', age: 'رده سنی', difficulty: 'سختی', chapter: 'فصل', stage: 'مرحله',
    load: 'بارگذاری', easy: 'ساده', medium: 'متوسط', hard: 'سخت', pulse: 'ارسال پالس', hint: 'راهنما −۲۵',
    undo: 'بازگشت', restart: 'شروع دوباره', next: 'مرحله بعد', ready: 'قطعه‌ها را بچرخان و مسیر نور را کامل کن.',
    rotated: 'قطعه چرخید؛ مسیر را دوباره بررسی کن.', sending: 'پالس در شبکه حرکت می‌کند…',
    failed: 'پالس متوقف شد؛ اتصال بعدی شبکه را اصلاح کن.', charging: 'پالس ثبت شد؛ شبکه برای پالس بعدی شارژ شد.',
    solved: 'عالی! ستاره روشن شد و مرحله کامل است.',
    hintDone: 'یک قطعهٔ مسیر اصلاح شد؛ ۲۵ امتیاز از پاداش کم می‌شود.', hintNone: 'چرخش مسیر درست است؛ پالس را ارسال کن.',
    noUndo: 'حرکتی برای بازگشت وجود ندارد.'
  },
  en: {
    tagline: 'Mind Labyrinth · Living Light Network', age: 'Age', difficulty: 'Difficulty', chapter: 'Chapter', stage: 'Stage',
    load: 'Load', easy: 'Easy', medium: 'Medium', hard: 'Hard', pulse: 'Send pulse', hint: 'Hint −25',
    undo: 'Undo', restart: 'Restart', next: 'Next stage', ready: 'Rotate the nodes and complete the light path.',
    rotated: 'Node rotated. Re-check the route.', sending: 'Pulse travelling through the network…',
    failed: 'Pulse stopped. Repair the next network connection.', charging: 'Pulse stored. The network is charged for the next pulse.',
    solved: 'Great! The star is lit and the stage is complete.',
    hintDone: 'One route node was corrected. Hint penalty: 25.', hintNone: 'The route rotations are correct. Send the pulse.',
    noUndo: 'There is no move to undo.'
  }
} as const

function el<T extends HTMLElement>(selector: string): T { return document.querySelector(selector) as T }
function keyOf(row: number, col: number) { return `${row}:${col}` }
function digits(value: number, locale: Locale) { return locale === 'fa' ? String(value).replace(/\d/g, d => FA[Number(d)]) : String(value) }

class NeyroScene extends Phaser.Scene {
  private locale: Locale = (localStorage.getItem('neyro.locale') as Locale) || 'fa'
  private ageBand: AgeBand = (localStorage.getItem('neyro.age') as AgeBand) || '5-8'
  private difficulty: Difficulty = (localStorage.getItem('neyro.difficulty') as Difficulty) || 'easy'
  private stageNumber = Math.min(1000, Math.max(1, Number(localStorage.getItem('neyro.stage') || 1)))
  private stage!: StageDefinition
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
    el<HTMLButtonElement>('#nextButton').onclick = () => this.loadStage(Math.min(1000, this.stageNumber + 1))
    el<HTMLButtonElement>('#loadButton').onclick = () => {
      if (this.pulsing) return
      this.ageBand = el<HTMLSelectElement>('#ageSelect').value as AgeBand
      this.difficulty = el<HTMLSelectElement>('#difficultySelect').value as Difficulty
      const requested = Number(el<HTMLInputElement>('#stageInput').value)
      this.loadStage(Math.min(1000, Math.max(1, requested || 1)))
    }
    el<HTMLSelectElement>('#chapterSelect').onchange = event => {
      if (this.pulsing) return
      const chapter = Number((event.target as HTMLSelectElement).value)
      this.loadStage((chapter - 1) * 125 + 1)
    }
    el<HTMLButtonElement>('#localeButton').onclick = () => {
      this.locale = this.locale === 'fa' ? 'en' : 'fa'
      localStorage.setItem('neyro.locale', this.locale)
      this.applyLocale(); this.updateHud(); this.drawBoard()
    }
  }

  private currentTrack() {
    return getTracks().find(track => track.ageBand === this.ageBand && track.difficulty === this.difficulty) ?? getTracks()[0]
  }

  private loadStage(number: number) {
    if (this.pulsing) return
    this.stageNumber = number
    this.stage = generateStage(this.currentTrack(), number)
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
    localStorage.setItem('neyro.age', this.ageBand); localStorage.setItem('neyro.difficulty', this.difficulty); localStorage.setItem('neyro.stage', String(number))
    this.applyLocale(); this.setStatus(copy[this.locale].ready); this.updateHud(); this.drawBoard()
  }

  private isRotatable(tile: StageTile) { return tile.kind === 'straight' || tile.kind === 'elbow' }
  private rotationAt(row: number, col: number, tile: StageTile): Rotation { return this.rotations[keyOf(row, col)] ?? tile.targetRotation }

  private ports(tile: StageTile, rotation: Rotation): Direction[] {
    if (tile.kind === 'empty' || tile.kind === 'blocker') return []
    if (tile.kind === 'relay') return ['N', 'E', 'S', 'W']
    if (tile.kind === 'phase') return this.pulseCount >= 1 ? ['N', 'E', 'S', 'W'] : []
    if (tile.kind === 'straight') return rotation % 2 === 0 ? ['E', 'W'] : ['N', 'S']
    if (tile.kind === 'elbow') return ([['N', 'E'], ['E', 'S'], ['S', 'W'], ['W', 'N']][rotation] ?? []) as Direction[]
    return []
  }

  private portsAt(row: number, col: number): Direction[] {
    const tile = this.stage.grid[row][col]
    if (tile.kind === 'start') return [this.stage.startDirection]
    if (tile.kind === 'goal') return [this.stage.goalDirection]
    return this.ports(tile, this.rotationAt(row, col, tile))
  }

  private tracePulse(): PulseTrace {
    const queue: Point[] = [{ row: 0, col: 0 }]
    const seen = new Set<string>(['0:0'])
    const order: Point[] = [{ row: 0, col: 0 }]
    const goalKey = keyOf(this.stage.track.boardSize - 1, this.stage.track.boardSize - 1)
    let endpoint = order[0]
    while (queue.length) {
      const current = queue.shift()!
      endpoint = current
      for (const direction of this.portsAt(current.row, current.col)) {
        const delta = DELTA[direction]
        const next = { row: current.row + delta.row, col: current.col + delta.col }
        if (next.row < 0 || next.col < 0 || next.row >= this.stage.track.boardSize || next.col >= this.stage.track.boardSize) continue
        if (!this.portsAt(next.row, next.col).includes(OPPOSITE[direction])) continue
        const key = keyOf(next.row, next.col)
        if (!seen.has(key)) { seen.add(key); order.push(next); queue.push(next) }
      }
    }
    const goalPoint = { row: this.stage.track.boardSize - 1, col: this.stage.track.boardSize - 1 }
    const connected = seen.has(goalKey)
    return { connected, order, endpoint: connected ? goalPoint : endpoint }
  }

  private setInteractionLocked(locked: boolean) {
    this.pulsing = locked
    for (const id of ['pulseButton', 'hintButton', 'undoButton', 'restartButton', 'nextButton', 'loadButton']) {
      el<HTMLButtonElement>(`#${id}`).disabled = locked
    }
    el<HTMLSelectElement>('#ageSelect').disabled = locked
    el<HTMLSelectElement>('#difficultySelect').disabled = locked
    el<HTMLSelectElement>('#chapterSelect').disabled = locked
    el<HTMLInputElement>('#stageInput').disabled = locked
  }

  private async animatePulse(order: Point[]) {
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
    this.pulseCount += 1
    this.setStatus(copy[this.locale].sending)
    this.updateHud()
    const trace = this.tracePulse()
    await this.animatePulse(trace.order)

    if (trace.connected && this.pulseCount >= this.stage.requiredPulses) {
      this.solved = true
      const bestKey = `neyro.best.${this.stage.id}`
      const score = Math.max(0, 1000 - this.moves * 12 - this.hints * 25 - (this.pulseCount - this.stage.requiredPulses) * 20)
      const previous = Number(localStorage.getItem(bestKey) || 0); if (score > previous) localStorage.setItem(bestKey, String(score))
      localStorage.setItem(`neyro.complete.${this.stage.id}`, '1')
      this.setStatus(copy[this.locale].solved)
    } else if (trace.connected) {
      this.setStatus(copy[this.locale].charging)
    } else {
      const nodeNumber = trace.order.length
      const detail = this.locale === 'fa' ? ` گره ${digits(nodeNumber, this.locale)} آخرین نقطه روشن بود.` : ` Node ${nodeNumber} was the last lit point.`
      this.setStatus(copy[this.locale].failed + detail)
    }
    this.updateHud(); this.drawBoard(); this.setInteractionLocked(false)
  }

  private rotate(row: number, col: number) {
    if (this.solved || this.pulsing) return
    const tile = this.stage.grid[row][col]; if (!this.isRotatable(tile)) return
    const key = keyOf(row, col); const previous = this.rotationAt(row, col, tile)
    this.undoStack.push({ key, previous })
    const span = tile.kind === 'straight' ? 2 : 4
    this.rotations[key] = ((previous + 1) % span) as Rotation
    this.moves += 1; this.reached.clear(); this.setStatus(copy[this.locale].rotated); this.updateHud(); this.drawBoard()
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
    this.rotations[key] = tile.targetRotation; this.moves += 1; this.hints += 1; this.reached.clear()
    this.setStatus(copy[this.locale].hintDone); this.updateHud(); this.drawBoard()
  }

  private undo() {
    if (this.pulsing) return
    const action = this.undoStack.pop(); if (!action) { this.setStatus(copy[this.locale].noUndo); return }
    this.rotations[action.key] = action.previous; this.moves = Math.max(0, this.moves - 1); this.reached.clear(); this.solved = false
    this.updateHud(); this.drawBoard()
  }

  private restart() {
    if (this.pulsing) return
    this.rotations = { ...this.initialRotations }; this.undoStack = []; this.moves = 0; this.hints = 0; this.pulseCount = 0; this.solved = false; this.reached.clear()
    this.setStatus(copy[this.locale].ready); this.updateHud(); this.drawBoard()
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

    this.stage.grid.forEach((row, r) => row.forEach((tile, c) => {
      const x = left + step * (c + .5), y = top + step * (r + .5), cell = Math.max(28, step - 7)
      const g = this.add.graphics(); const reached = this.reached.has(keyOf(r, c)); const onPath = this.stage.solutionPath.some(p => p.row === r && p.col === c)
      const fill = tile.kind === 'blocker' ? 0x171e2d : tile.kind === 'empty' ? 0x0b1727 : reached ? 0x123b3a : 0x11243c
      g.fillStyle(fill, 1); g.lineStyle(reached ? 3 : 1, reached ? 0x5ee0c1 : onPath ? 0x355a76 : 0x20384f, 1); g.fillRoundedRect(x - cell / 2, y - cell / 2, cell, cell, Math.min(12, cell * .16)); g.strokeRoundedRect(x - cell / 2, y - cell / 2, cell, cell, Math.min(12, cell * .16))
      this.board!.add(g)
      if (tile.kind === 'start' || tile.kind === 'goal') {
        const color = tile.kind === 'start' ? 0x5ee0c1 : 0xffd66b; const node = this.add.graphics(); node.fillStyle(0x0b1727, 1); node.lineStyle(4, color, 1); node.fillCircle(x, y, cell * .24); node.strokeCircle(x, y, cell * .24); this.board!.add(node)
        const text = this.add.text(x, y, tile.kind === 'start' ? '◆' : '★', { fontFamily: 'system-ui', fontSize: `${Math.max(13, cell * .24)}px`, color: tile.kind === 'start' ? '#5ee0c1' : '#ffd66b', fontStyle: 'bold' }).setOrigin(.5); this.board!.add(text); return
      }
      if (tile.kind === 'blocker') { const xg = this.add.graphics(); xg.lineStyle(5, 0x6b7891, 1); xg.beginPath(); xg.moveTo(x-cell*.2,y-cell*.2); xg.lineTo(x+cell*.2,y+cell*.2); xg.moveTo(x+cell*.2,y-cell*.2); xg.lineTo(x-cell*.2,y+cell*.2); xg.strokePath(); this.board!.add(xg); return }
      if (tile.kind === 'empty') return
      const rotation = this.rotationAt(r, c, tile); const pipe = this.add.graphics(); pipe.lineStyle(Math.max(5, cell * .1), reached ? 0xffd66b : tile.mechanic === 'decoy' ? 0x537998 : 0x88b9db, 1)
      const len = cell * .38
      if (tile.kind === 'relay' || tile.kind === 'phase') {
        pipe.beginPath(); pipe.moveTo(x-len,y); pipe.lineTo(x+len,y); pipe.moveTo(x,y-len); pipe.lineTo(x,y+len); pipe.strokePath(); pipe.fillStyle(tile.kind === 'phase' ? 0x9278ff : 0x5ee0c1,1); pipe.fillCircle(x,y,Math.max(5,cell*.09))
      } else {
        const ports = this.ports(tile, rotation); pipe.beginPath(); for (const direction of ports) { const d = DELTA[direction]; pipe.moveTo(x,y); pipe.lineTo(x+d.col*len,y+d.row*len) } pipe.strokePath()
      }
      this.board!.add(pipe)
      if (this.isRotatable(tile) && !this.pulsing) {
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