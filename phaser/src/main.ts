import Phaser from 'phaser'
import './style.css'
import {
  CHAPTERS_PER_TRACK,
  STAGES_PER_CHAPTER,
  STAGES_PER_TRACK,
  generateStage,
  getTracks,
  type AgeBand,
  type Difficulty,
  type Direction,
  type StageDefinition,
  type StageTile
} from './core/stage-engine'
import { applyPulse, createRuntimeState, type RuntimeState } from './core/runtime-engine'

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
    tagline: 'هزارتوی ذهن', age: 'رده سنی', difficulty: 'سختی', chapter: 'فصل', stage: 'مرحله', boardSize: 'اندازه صفحه',
    load: 'اعمال', easy: 'ساده', medium: 'متوسط', hard: 'سخت', pulse: 'ارسال پالس', hint: 'راهنما −۲۵', undo: 'بازگشت', restart: 'شروع دوباره', next: 'مرحله بعد',
    ready: 'قطعه‌ها را بچرخان و مسیر نور را کامل کن.', rotatedLeft: 'کاشی ۹۰ درجه به چپ چرخید.', rotatedRight: 'کاشی ۹۰ درجه به راست چرخید.', sending: 'پالس در شبکه حرکت می‌کند…',
    failed: 'پالس متوقف شد؛ اتصال بعدی شبکه را اصلاح کن.', charging: 'پالس ثبت شد؛ شبکه برای پالس بعدی شارژ شد.', solved: 'عالی! ستاره روشن شد و مرحله کامل است.',
    hintDone: 'یک قطعهٔ مسیر اصلاح شد؛ ۲۵ امتیاز از پاداش کم می‌شود.', hintNone: 'چرخش مسیر درست است؛ پالس را ارسال کن.', noUndo: 'حرکتی برای بازگشت وجود ندارد.',
    phaseClosed: 'دروازه فاز هنوز بسته است؛ پالس بعدی را آماده کن.', relayOrder: 'رله‌ها باید به ترتیب صحیح فعال شوند.', relayMissing: 'همهٔ رله‌های لازم هنوز شارژ نشده‌اند.', locked: 'ابتدا مرحله فعلی را کامل کن تا مرحله بعد باز شود.',
    tutorial1: 'آموزش ۱ از ۳: از لوزی فیروزه‌ای شروع کن. کاشی مشخص‌شده را بچرخان و مسیر را به سمت ستاره بساز.', tutorial2: 'آموزش ۲ از ۳: کاشی‌های مسیر قابل چرخش هستند. مسیر روشن را از آغاز تا ستاره کامل کن.', tutorial3: 'آموزش ۳ از ۳: مسیر را خودت کامل کن؛ اگر گیر کردی «راهنما» یک حرکت درست را نشان می‌دهد.', tutorialPulse: 'مسیر آماده است؛ حالا «ارسال پالس» را بزن.',
    guideTitle: 'راهنمای بازی', guideCopy: 'کاشی‌ها را بچرخان و مسیر نور را از آغاز تا هدف کامل کن.', leftClickTitle: 'کلیک چپ', leftClickCopy: 'چرخش به چپ (۹۰− درجه)', rightClickTitle: 'کلیک راست', rightClickCopy: 'چرخش به راست (۹۰+ درجه)', touchTitle: 'موبایل / تبلت', touchCopy: 'با لمس هر کاشی آن را بچرخان.', progressTitle: 'پیشرفت', progressCopy: 'پیشرفت در این مسیر', futureCopy: 'چالش امروز، ذهن قوی‌تر فردا', legendStart: 'شروع', legendGoal: 'هدف', legendStraight: 'مسیر مستقیم', legendElbow: 'گوشه', legendBlocker: 'مسدود'
  },
  en: {
    tagline: 'Mind Labyrinth', age: 'Age', difficulty: 'Difficulty', chapter: 'Chapter', stage: 'Stage', boardSize: 'Board size',
    load: 'Apply', easy: 'Easy', medium: 'Medium', hard: 'Hard', pulse: 'Send pulse', hint: 'Hint −25', undo: 'Undo', restart: 'Restart', next: 'Next stage',
    ready: 'Rotate the nodes and complete the light path.', rotatedLeft: 'Tile rotated 90° left.', rotatedRight: 'Tile rotated 90° right.', sending: 'Pulse travelling through the network…', failed: 'Pulse stopped. Repair the next network connection.', charging: 'Pulse stored. The network is charged for the next pulse.', solved: 'Great! The star is lit and the stage is complete.', hintDone: 'One route node was corrected. Hint penalty: 25.', hintNone: 'The route rotations are correct. Send the pulse.', noUndo: 'There is no move to undo.', phaseClosed: 'The phase gate is still closed. Prepare the next pulse.', relayOrder: 'Relays must be activated in the correct order.', relayMissing: 'Not all required relays are charged yet.', locked: 'Finish the current stage first to unlock the next one.',
    tutorial1: 'Tutorial 1 of 3: start at the cyan diamond. Rotate the highlighted tile and build the route toward the star.', tutorial2: 'Tutorial 2 of 3: route tiles can be rotated. Complete the lit route from start to star.', tutorial3: 'Tutorial 3 of 3: complete the route yourself. Hint reveals one correct move if you get stuck.', tutorialPulse: 'The route is ready. Press Send pulse.',
    guideTitle: 'How to play', guideCopy: 'Rotate tiles and complete the light path from start to goal.', leftClickTitle: 'Left click', leftClickCopy: 'Rotate left (−90°)', rightClickTitle: 'Right click', rightClickCopy: 'Rotate right (+90°)', touchTitle: 'Mobile / tablet', touchCopy: 'Tap a rotatable tile to turn it.', progressTitle: 'Progress', progressCopy: 'Progress on this track', futureCopy: 'Stronger mind, one challenge at a time', legendStart: 'Start', legendGoal: 'Goal', legendStraight: 'Straight', legendElbow: 'Elbow', legendBlocker: 'Blocked'
  }
} as const

const el = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T
const maybe = (selector: string) => document.querySelector<HTMLElement>(selector)
const keyOf = (row: number, col: number) => `${row}:${col}`
const digits = (value: number | string, locale: Locale) => locale === 'fa' ? String(value).replace(/\d/g, d => FA[Number(d)]) : String(value)

class NeyroScene extends Phaser.Scene {
  private locale: Locale = (localStorage.getItem('neyro.locale') as Locale) || 'fa'
  private ageBand: AgeBand = (localStorage.getItem('neyro.age') as AgeBand) || '5-8'
  private difficulty: Difficulty = (localStorage.getItem('neyro.difficulty') as Difficulty) || 'easy'
  private boardSizeOverride = Math.min(50, Math.max(3, Number(localStorage.getItem('neyro.boardSize') || 0)))
  private tutorialComplete = localStorage.getItem('neyro.tutorialComplete') === '1'
  private stageNumber = this.tutorialComplete ? Math.min(STAGES_PER_TRACK, Math.max(1, Number(localStorage.getItem('neyro.stage') || 1))) : 1
  private stage!: StageDefinition
  private runtime!: RuntimeState
  private rotations: RotationMap = {}
  private initialRotations: RotationMap = {}
  private undoStack: UndoEntry[] = []
  private moves = 0
  private hints = 0
  private pulseCount = 0
  private masteryScore = 0
  private stars = 0
  private totalXp = Math.max(0, Number(localStorage.getItem('neyro.xp') || 0))
  private stageStartedAt = performance.now()
  private reached = new Set<string>()
  private solved = false
  private pulsing = false
  private board?: Phaser.GameObjects.Container

  constructor() { super('neyro') }

  create() {
    this.game.canvas.addEventListener('contextmenu', event => event.preventDefault())
    this.bindControls()
    this.bindLargeBoardNavigation()
    this.scale.on('resize', () => this.drawBoard())
    this.loadStage(this.stageNumber)
  }

  private bindLargeBoardNavigation() {
    const camera = this.cameras.main
    let dragging = false
    let lastX = 0
    let lastY = 0

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if ((this.stage?.track.boardSize ?? 0) < 12) return
      if (pointer.middleButtonDown() || pointer.event.shiftKey) { dragging = true; lastX = pointer.x; lastY = pointer.y }
    })
    this.input.on('pointerup', () => { dragging = false })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!dragging) return
      const dx = (pointer.x - lastX) / camera.zoom
      const dy = (pointer.y - lastY) / camera.zoom
      camera.scrollX -= dx
      camera.scrollY -= dy
      lastX = pointer.x; lastY = pointer.y
    })
  }

  private bindControls() {
    const chapterSelect = el<HTMLSelectElement>('#chapterSelect')
    chapterSelect.replaceChildren()
    for (let chapter = 1; chapter <= CHAPTERS_PER_TRACK; chapter += 1) {
      const option = document.createElement('option')
      option.value = String(chapter)
      option.textContent = `${copy[this.locale].chapter} ${digits(chapter, this.locale)}`
      chapterSelect.append(option)
    }
    const stageSelect = el<HTMLSelectElement>('#stageSelect')
    const boardSizeSelect = el<HTMLSelectElement>('#boardSizeSelect')
    boardSizeSelect.replaceChildren()
    for (let size = 3; size <= 50; size += 1) {
      const option = document.createElement('option')
      option.value = String(size)
      option.textContent = `${digits(size, this.locale)}×${digits(size, this.locale)}`
      boardSizeSelect.append(option)
    }
    this.refreshStageSelect()

    el<HTMLButtonElement>('#pulseButton').onclick = () => void this.sendPulse()
    el<HTMLButtonElement>('#hintButton').onclick = () => this.hint()
    el<HTMLButtonElement>('#undoButton').onclick = () => this.undo()
    el<HTMLButtonElement>('#restartButton').onclick = () => this.restart()
    el<HTMLButtonElement>('#nextButton').onclick = () => {
      if (!this.solved) { this.setStatus(copy[this.locale].locked); return }
      this.loadStage(Math.min(STAGES_PER_TRACK, this.stageNumber + 1))
    }
    el<HTMLButtonElement>('#loadButton').onclick = () => {
      if (this.pulsing) return
      this.ageBand = el<HTMLSelectElement>('#ageSelect').value as AgeBand
      this.difficulty = el<HTMLSelectElement>('#difficultySelect').value as Difficulty
      this.boardSizeOverride = Number(boardSizeSelect.value)
      localStorage.setItem('neyro.boardSize', String(this.boardSizeOverride))
      const requested = Math.min(STAGES_PER_TRACK, Math.max(1, Number(stageSelect.value) || 1))
      this.loadStage(Math.min(requested, this.highestUnlocked()))
    }
    chapterSelect.onchange = event => {
      if (this.pulsing) return
      const chapter = Number((event.target as HTMLSelectElement).value)
      const firstStage = (chapter - 1) * STAGES_PER_CHAPTER + 1
      this.refreshStageSelect(chapter)
      this.loadStage(Math.min(firstStage, this.highestUnlocked()))
    }
    el<HTMLButtonElement>('#localeButton').onclick = () => {
      this.locale = this.locale === 'fa' ? 'en' : 'fa'
      localStorage.setItem('neyro.locale', this.locale)
      this.applyLocale(); this.refreshStageSelect(); this.updateHud(); this.updateScoreHud(); this.setStageInstruction(); this.drawBoard()
    }
  }

  private refreshStageSelect(chapterOverride?: number) {
    const chapterSelect = el<HTMLSelectElement>('#chapterSelect')
    const stageSelect = el<HTMLSelectElement>('#stageSelect')
    const chapter = chapterOverride ?? Number(chapterSelect.value || 1)
    const first = (chapter - 1) * STAGES_PER_CHAPTER + 1
    const last = Math.min(STAGES_PER_TRACK, first + STAGES_PER_CHAPTER - 1)
    const highestUnlocked = this.highestUnlocked()
    const current = this.stageNumber
    stageSelect.replaceChildren()

    for (let globalStage = first; globalStage <= last; globalStage += 1) {
      const option = document.createElement('option')
      option.value = String(globalStage)
      const localStage = globalStage - first + 1
      const locked = globalStage > highestUnlocked
      option.disabled = locked
      option.textContent = locked
        ? `${digits(localStage, this.locale)}  🔒`
        : digits(localStage, this.locale)
      stageSelect.append(option)
    }

    const currentInChapter = current >= first && current <= last
    const fallback = Math.min(Math.max(first, Math.min(highestUnlocked, last)), last)
    stageSelect.value = String(currentInChapter ? current : fallback)
  }

  private currentTrack() { return getTracks().find(track => track.ageBand === this.ageBand && track.difficulty === this.difficulty) ?? getTracks()[0] }
  private unlockKey() { return `neyro.unlocked.${this.currentTrack().id}` }
  private highestUnlocked() {
    if (!this.tutorialComplete) return Math.min(3, Math.max(1, Number(localStorage.getItem(this.unlockKey()) || 1)))
    return Math.min(STAGES_PER_TRACK, Math.max(1, Number(localStorage.getItem(this.unlockKey()) || 1)))
  }
  private unlockNext() {
    const next = Math.min(STAGES_PER_TRACK, this.stageNumber + 1)
    if (next > this.highestUnlocked()) localStorage.setItem(this.unlockKey(), String(next))
    if (this.stageNumber >= 3 && !this.tutorialComplete) {
      this.tutorialComplete = true
      localStorage.setItem('neyro.tutorialComplete', '1')
      if (Number(localStorage.getItem(this.unlockKey()) || 1) < 4) localStorage.setItem(this.unlockKey(), '4')
    }
    this.refreshStageSelect()
  }

  private syncRuntimeRotations() { this.runtime = { ...this.runtime, rotations: { ...this.rotations }, reached: [], complete: false } }

  private loadStage(number: number) {
    if (this.pulsing) return
    const allowed = this.tutorialComplete ? this.highestUnlocked() : Math.min(3, this.highestUnlocked())
    this.stageNumber = Math.min(number, allowed)
    this.stage = generateStage(this.currentTrack(), this.stageNumber, this.boardSizeOverride || undefined)
    this.moves = 0; this.hints = 0; this.pulseCount = 0; this.masteryScore = 0; this.stars = 0; this.stageStartedAt = performance.now(); this.solved = false; this.reached.clear(); this.undoStack = []
    this.rotations = {}
    this.stage.grid.forEach((row, r) => row.forEach((tile, c) => {
      if (!this.isRotatable(tile)) return
      const span = tile.kind === 'straight' ? 2 : 4
      let rotation = ((tile.targetRotation + 1 + ((this.stage.seed + r * 17 + c * 31) % Math.max(1, span - 1))) % span) as Rotation
      if (tile.kind === 'straight') rotation = (rotation % 2) as Rotation
      this.rotations[keyOf(r, c)] = rotation
    }))
    this.initialRotations = { ...this.rotations }
    this.runtime = createRuntimeState(this.stage, this.rotations)
    localStorage.setItem('neyro.age', this.ageBand)
    localStorage.setItem('neyro.difficulty', this.difficulty)
    localStorage.setItem('neyro.stage', String(this.stageNumber))
    this.refreshStageSelect(Math.floor((this.stageNumber - 1) / STAGES_PER_CHAPTER) + 1)
    this.applyLocale(); this.setStageInstruction(); this.updateHud(); this.drawBoard(); this.updateNextState()
    window.dispatchEvent(new CustomEvent('neyro:stage-loaded', { detail: { stageNumber: this.stageNumber, chapter: this.stage.chapter, highestUnlocked: this.highestUnlocked() } }))
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
    for (const id of ['pulseButton', 'hintButton', 'undoButton', 'restartButton', 'loadButton']) el<HTMLButtonElement>(`#${id}`).disabled = locked
    el<HTMLSelectElement>('#ageSelect').disabled = locked
    el<HTMLSelectElement>('#difficultySelect').disabled = locked
    el<HTMLSelectElement>('#chapterSelect').disabled = locked
    el<HTMLSelectElement>('#boardSizeSelect').disabled = locked
    el<HTMLSelectElement>('#stageSelect').disabled = locked
    this.updateNextState()
  }
  private updateNextState() { el<HTMLButtonElement>('#nextButton').disabled = this.pulsing || !this.solved || this.stageNumber >= STAGES_PER_TRACK }

  private async animatePulse(order: { row: number; col: number }[]) {
    this.reached.clear(); this.drawBoard()
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 90
    for (const point of order) {
      this.reached.add(keyOf(point.row, point.col)); this.drawBoard()
      if (delay > 0) await new Promise<void>(resolve => this.time.delayedCall(delay, () => resolve()))
    }
  }

  private calculateMasteryScore() {
    if (!this.solved) return 0
    const boardComplexity = Math.max(1, this.stage.track.boardSize * this.stage.track.boardSize)
    const parMoves = Math.max(6, Math.round(Math.sqrt(boardComplexity) * 1.6))
    const moveEfficiency = Phaser.Math.Clamp(1 - Math.max(0, this.moves - parMoves) / Math.max(parMoves, 1), 0, 1)
    const elapsedSeconds = Math.max(1, (performance.now() - this.stageStartedAt) / 1000)
    const parSeconds = Math.max(20, Math.sqrt(boardComplexity) * 3.5)
    const timeEfficiency = Phaser.Math.Clamp(parSeconds / elapsedSeconds, 0, 1)
    const cleanRun = Phaser.Math.Clamp(1 - this.hints * 0.35 - Math.max(0, this.pulseCount - this.stage.requiredPulses) * 0.15, 0, 1)
    return Math.round(400 + 300 * moveEfficiency + 150 * timeEfficiency + 150 * cleanRun)
  }

  private awardCompletionScore() {
    this.masteryScore = this.calculateMasteryScore()
    this.stars = this.masteryScore >= 900 ? 3 : this.masteryScore >= 700 ? 2 : 1
    const multiplier = this.difficulty === 'hard' ? 1.35 : this.difficulty === 'medium' ? 1.15 : 1
    const boardBonus = 1 + Math.min(0.35, Math.max(0, this.stage.track.boardSize - 4) * 0.01)
    const gainedXp = Math.max(25, Math.round(this.masteryScore * 0.12 * multiplier * boardBonus))
    this.totalXp += gainedXp
    localStorage.setItem('neyro.xp', String(this.totalXp))
    const bestKey = 'neyro.best.' + this.stage.id
    const previous = Number(localStorage.getItem(bestKey) || 0)
    if (this.masteryScore > previous) localStorage.setItem(bestKey, String(this.masteryScore))
  }

  private updateScoreHud() {
    const mastery = maybe('#masteryScore')
    const stars = maybe('#starScore')
    const xp = maybe('#xpScore')
    if (mastery) mastery.textContent = digits(this.masteryScore, this.locale)
    if (stars) stars.textContent = '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars)
    if (xp) xp.textContent = digits(this.totalXp, this.locale)
  }

  private async sendPulse() {
    if (this.solved || this.pulsing) return
    this.setInteractionLocked(true); this.syncRuntimeRotations(); this.setStatus(copy[this.locale].sending)
    const result = applyPulse(this.stage, this.runtime)
    this.runtime = result.state; this.pulseCount = this.runtime.pulseIndex; this.updateHud()
    const order = result.reached.map(key => { const [row, col] = key.split(':').map(Number); return { row, col } })
    await this.animatePulse(order)

    if (result.complete) {
      this.solved = true
      const xpBefore = this.totalXp
      this.awardCompletionScore()
      const elapsedSeconds = Math.max(1, Math.round((performance.now() - this.stageStartedAt) / 1000))
      window.dispatchEvent(new CustomEvent('neyro:stage-complete', { detail: {
        stageNumber: this.stageNumber, chapter: this.stage.chapter, mastery: this.masteryScore, stars: this.stars,
        moves: this.moves, hints: this.hints, elapsedSeconds, xpGain: this.totalXp - xpBefore, totalXp: this.totalXp
      } }))
      localStorage.setItem('neyro.complete.' + this.stage.id, '1')
      this.unlockNext(); this.setStatus(copy[this.locale].solved)
    } else if (result.failure === 'phase-closed') this.setStatus(copy[this.locale].phaseClosed)
    else if (result.failure === 'relay-order') this.setStatus(copy[this.locale].relayOrder)
    else if (result.failure === 'relay-missing') this.setStatus(copy[this.locale].relayMissing)
    else if (result.goalReached) this.setStatus(copy[this.locale].charging)
    else {
      const nodeNumber = Math.max(1, order.length)
      const detail = this.locale === 'fa' ? ` گره ${digits(nodeNumber, this.locale)} آخرین نقطه روشن بود.` : ` Node ${nodeNumber} was the last lit point.`
      this.setStatus(copy[this.locale].failed + detail)
    }
    this.updateHud(); this.updateScoreHud(); this.drawBoard(); this.setInteractionLocked(false); this.updateNextState()
  }

  private rotate(row: number, col: number, delta: -1 | 1) {
    if (this.solved || this.pulsing) return
    const tile = this.stage.grid[row][col]
    if (!this.isRotatable(tile)) return
    const key = keyOf(row, col); const previous = this.rotationAt(row, col, tile)
    this.undoStack.push({ key, previous })
    const span = tile.kind === 'straight' ? 2 : 4
    this.rotations[key] = ((previous + delta + span) % span) as Rotation
    this.syncRuntimeRotations(); this.moves += 1; this.reached.clear()
    const ready = this.routeReady() && !this.tutorialComplete && this.stageNumber <= 3
    this.setStatus(ready ? copy[this.locale].tutorialPulse : delta === -1 ? copy[this.locale].rotatedLeft : copy[this.locale].rotatedRight)
    this.updateHud(); this.updateScoreHud(); this.drawBoard()
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
    this.rotations[key] = tile.targetRotation
    this.syncRuntimeRotations(); this.moves += 1; this.hints += 1; this.reached.clear()
    this.setStatus(this.routeReady() && !this.tutorialComplete && this.stageNumber <= 3 ? copy[this.locale].tutorialPulse : copy[this.locale].hintDone)
    this.updateHud(); this.drawBoard()
  }

  private undo() {
    if (this.pulsing) return
    const action = this.undoStack.pop()
    if (!action) { this.setStatus(copy[this.locale].noUndo); return }
    this.rotations[action.key] = action.previous
    this.syncRuntimeRotations(); this.moves = Math.max(0, this.moves - 1); this.reached.clear(); this.solved = false
    this.updateHud(); this.drawBoard(); this.updateNextState()
  }
  private restart() {
    if (this.pulsing) return
    this.rotations = { ...this.initialRotations }; this.undoStack = []; this.moves = 0; this.hints = 0; this.pulseCount = 0; this.solved = false; this.reached.clear()
    this.runtime = createRuntimeState(this.stage, this.rotations)
    this.setStageInstruction(); this.updateHud(); this.drawBoard(); this.updateNextState()
  }

  private applyLocale() {
    const c = copy[this.locale]
    document.documentElement.lang = this.locale
    document.documentElement.dir = this.locale === 'fa' ? 'rtl' : 'ltr'
    const values: Record<string, string> = {
      '#tagline': c.tagline, '#ageText': c.age, '#difficultyText': c.difficulty, '#chapterText': c.chapter, '#stageText': c.stage, '#boardSizeText': c.boardSize,
      '#guideTitle': c.guideTitle, '#guideCopy': c.guideCopy, '#leftClickTitle': c.leftClickTitle, '#leftClickCopy': c.leftClickCopy,
      '#rightClickTitle': c.rightClickTitle, '#rightClickCopy': c.rightClickCopy, '#touchTitle': c.touchTitle, '#touchCopy': c.touchCopy,
      '#progressTitle': c.progressTitle, '#progressCopy': c.progressCopy, '#futureCopy': c.futureCopy,
      '#scoreTitle': this.locale === 'fa' ? 'امتیاز' : 'Score', '#masteryLabel': this.locale === 'fa' ? 'مهارت' : 'Mastery', '#starsLabel': this.locale === 'fa' ? 'ستاره' : 'Stars', '#xpLabel': 'XP',
      '#legendStart': c.legendStart, '#legendGoal': c.legendGoal, '#legendStraight': c.legendStraight, '#legendElbow': c.legendElbow, '#legendBlocker': c.legendBlocker
    }
    for (const [selector, value] of Object.entries(values)) { const node = maybe(selector); if (node) node.textContent = value }
    el<HTMLButtonElement>('#loadButton').textContent = c.load
    el<HTMLButtonElement>('#pulseButton').textContent = c.pulse
    el<HTMLButtonElement>('#hintButton').textContent = c.hint
    el<HTMLButtonElement>('#undoButton').textContent = c.undo
    el<HTMLButtonElement>('#restartButton').textContent = c.restart
    el<HTMLButtonElement>('#nextButton').textContent = c.next
    el<HTMLButtonElement>('#localeButton').textContent = this.locale === 'fa' ? 'EN' : 'فا'
    const difficulty = el<HTMLSelectElement>('#difficultySelect').options
    difficulty[0].text = c.easy; difficulty[1].text = c.medium; difficulty[2].text = c.hard
    for (let i = 0; i < CHAPTERS_PER_TRACK; i += 1) el<HTMLSelectElement>('#chapterSelect').options[i].text = `${c.chapter} ${digits(i + 1, this.locale)}`
    const boardSizeSelect = el<HTMLSelectElement>('#boardSizeSelect')
    Array.from(boardSizeSelect.options).forEach(option => {
      const n = Number(option.value)
      option.text = `${digits(n, this.locale)}×${digits(n, this.locale)}`
    })
    el<HTMLSelectElement>('#ageSelect').value = this.ageBand
    el<HTMLSelectElement>('#difficultySelect').value = this.difficulty
    boardSizeSelect.value = String(this.boardSizeOverride || this.stage?.track.boardSize || 4)
    el<HTMLSelectElement>('#stageSelect').value = String(this.stageNumber)
    el<HTMLSelectElement>('#chapterSelect').value = String(this.stage?.chapter ?? 1)
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
    const cap = w >= 1100 ? 820 : 720
    const viewportSize = Math.min(w * .94, h * .92, cap)
    const minimumStep = n >= 30 ? 28 : n >= 20 ? 31 : n >= 12 ? 35 : 0
    const step = Math.max(viewportSize / n, minimumStep)
    const size = step * n
    const camera = this.cameras.main
    const padding = 28
    const largeBoard = size > w || size > h
    const fitZoom = largeBoard
      ? Phaser.Math.Clamp(Math.min(w / (size + padding * 2), h / (size + padding * 2)), .35, 1)
      : 1
    const visibleWorldWidth = w / fitZoom
    const visibleWorldHeight = h / fitZoom
    const worldWidth = Math.max(size + padding * 2, visibleWorldWidth)
    const worldHeight = Math.max(size + padding * 2, visibleWorldHeight)
    const left = (worldWidth - size) / 2
    const top = (worldHeight - size) / 2
    camera.setBounds(0, 0, worldWidth, worldHeight)
    camera.setZoom(fitZoom)
    camera.centerOn(worldWidth / 2, worldHeight / 2)
    const panel = this.add.graphics(); panel.fillStyle(0x071422, 1); panel.lineStyle(2, 0x1f5a73, 1); panel.fillRoundedRect(left - 14, top - 14, size + 28, size + 28, 24); panel.strokeRoundedRect(left - 14, top - 14, size + 28, size + 28, 24); this.board.add(panel)
    this.stage.grid.forEach((row, r) => row.forEach((tile, c) => {
      const x = left + step * (c + .5), y = top + step * (r + .5), cell = Math.max(28, step - 7), key = keyOf(r, c)
      const reached = this.reached.has(key)
      const chargedRelay = tile.kind === 'relay' && this.runtime?.chargedRelays.includes(key)
      const chargedMirror = tile.mechanic === 'charged-mirror' && this.runtime?.chargedMirrors.includes(key)
      const fill = tile.kind === 'blocker' ? 0x171e2d : tile.kind === 'empty' ? 0x071421 : reached ? 0x0b4a42 : chargedRelay || chargedMirror ? 0x243553 : 0x102943
      const g = this.add.graphics(); g.fillStyle(fill, 1)
      g.lineStyle(reached ? 3 : chargedRelay || chargedMirror ? 3 : 1, reached ? 0x54f2cc : chargedRelay || chargedMirror ? 0xffd66b : 0x1c3d56, 1)
      g.fillRoundedRect(x - cell / 2, y - cell / 2, cell, cell, Math.min(12, cell * .16)); g.strokeRoundedRect(x - cell / 2, y - cell / 2, cell, cell, Math.min(12, cell * .16)); this.board!.add(g)

      if (tile.kind === 'start' || tile.kind === 'goal') {
        const color = tile.kind === 'start' ? 0x54f2cc : 0xffd45c
        const node = this.add.graphics(); node.fillStyle(0x071421, 1); node.lineStyle(4, color, 1); node.fillCircle(x, y, cell * .24); node.strokeCircle(x, y, cell * .24); this.board!.add(node)
        this.board!.add(this.add.text(x, y, tile.kind === 'start' ? '◆' : '★', { fontFamily: 'system-ui', fontSize: `${Math.max(13, cell * .24)}px`, color: tile.kind === 'start' ? '#54f2cc' : '#ffd45c', fontStyle: 'bold' }).setOrigin(.5))
        if (tile.kind === 'start') { const d = DELTA[this.stage.startDirection]; this.board!.add(this.add.text(x + d.col * cell * .39, y + d.row * cell * .39, ARROW[this.stage.startDirection], { fontFamily: 'system-ui', fontSize: `${Math.max(16, cell * .28)}px`, color: '#54f2cc', fontStyle: 'bold' }).setOrigin(.5)) }
        return
      }
      if (tile.kind === 'blocker') {
        const xg = this.add.graphics(); xg.lineStyle(5, 0x77849a, 1); xg.beginPath(); xg.moveTo(x-cell*.2,y-cell*.2); xg.lineTo(x+cell*.2,y+cell*.2); xg.moveTo(x+cell*.2,y-cell*.2); xg.lineTo(x-cell*.2,y+cell*.2); xg.strokePath(); this.board!.add(xg); return
      }
      if (tile.kind === 'empty') return
      const rotation = this.rotationAt(r, c, tile), pipe = this.add.graphics()
      pipe.lineStyle(Math.max(5, cell * .1), reached ? 0xffd45c : 0x9bd5ff, 1)
      const len = cell * .38
      if (tile.kind === 'relay' || tile.kind === 'phase') {
        pipe.beginPath(); pipe.moveTo(x-len,y); pipe.lineTo(x+len,y); pipe.moveTo(x,y-len); pipe.lineTo(x,y+len); pipe.strokePath(); pipe.fillStyle(tile.kind === 'phase' ? 0x9278ff : chargedRelay ? 0xffd45c : 0x54f2cc,1); pipe.fillCircle(x,y,Math.max(5,cell*.09))
      } else {
        pipe.beginPath(); for (const direction of this.ports(tile, rotation)) { const d = DELTA[direction]; pipe.moveTo(x,y); pipe.lineTo(x+d.col*len,y+d.row*len) } pipe.strokePath()
      }
      this.board!.add(pipe)
      if (this.isRotatable(tile) && !this.pulsing) {
        const hit = this.add.zone(x, y, cell, cell).setInteractive({ useHandCursor: true })
        hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          const delta: -1 | 1 = pointer.pointerType === 'mouse' && pointer.button === 0 ? -1 : 1
          this.rotate(r, c, delta)
        })
        this.board!.add(hit)
      }
    }))
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: 'game', backgroundColor: '#07101c', scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, scene: NeyroScene, render: { antialias: true, pixelArt: false } })
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined))
