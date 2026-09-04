import Phaser from 'phaser'
import './style.css'

type Tile = { x: number; y: number; orientation: 0 | 1; required: 0 | 1; sprite?: Phaser.GameObjects.Container }

const faDigits = (value: number) => String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

class NeyroScene extends Phaser.Scene {
  private tiles: Tile[] = []
  private moves = 0
  private stage = 1
  private board?: Phaser.GameObjects.Container

  constructor() { super('neyro') }

  create() {
    this.scale.on('resize', () => this.drawBoard())
    this.newStage()

    document.querySelector('#pulseButton')?.addEventListener('click', () => this.sendPulse())
    document.querySelector('#hintButton')?.addEventListener('click', () => this.hint())
    document.querySelector('#nextButton')?.addEventListener('click', () => { this.stage += 1; this.newStage() })
  }

  private newStage() {
    this.moves = 0
    this.tiles = [
      { x: 1, y: 2, orientation: Math.random() > .5 ? 1 : 0, required: 0 },
      { x: 2, y: 2, orientation: Math.random() > .5 ? 1 : 0, required: 0 },
      { x: 3, y: 2, orientation: Math.random() > .5 ? 1 : 0, required: 0 },
      { x: 2, y: 1, orientation: Math.random() > .5 ? 1 : 0, required: 1 },
      { x: 2, y: 3, orientation: Math.random() > .5 ? 1 : 0, required: 1 }
    ]
    this.setStatus('مسیر نور را کامل کن')
    this.updateHud()
    this.drawBoard()
  }

  private drawBoard() {
    this.board?.destroy(true)
    this.board = this.add.container(0, 0)

    const w = this.scale.width
    const h = this.scale.height
    const size = Math.min(w * .82, h * .78)
    const step = size / 5
    const left = (w - size) / 2
    const top = (h - size) / 2

    const panel = this.add.graphics()
    panel.fillStyle(0x182553, 1)
    panel.lineStyle(2, 0x43568f, 1)
    panel.fillRoundedRect(left - 24, top - 24, size + 48, size + 48, 28)
    panel.strokeRoundedRect(left - 24, top - 24, size + 48, size + 48, 28)
    this.board.add(panel)

    const cy = top + step * 2.5
    const startX = left + step * .18
    const goalX = left + step * 4.82

    const beam = this.add.graphics()
    beam.lineStyle(Math.max(8, step * .08), 0x6feae4, this.isSolved() ? 1 : .18)
    beam.beginPath(); beam.moveTo(startX, cy); beam.lineTo(goalX, cy); beam.strokePath()
    this.board.add(beam)

    this.drawNode(startX, cy, 0x58e3dd, 'آغاز')
    this.drawNode(goalX, cy, 0x9278ff, 'ستاره')

    for (const tile of this.tiles) {
      const px = left + step * (tile.x + .5)
      const py = top + step * (tile.y + .5)
      const box = this.add.container(px, py)
      const g = this.add.graphics()
      const tileSize = Math.min(step * .62, 86)
      g.fillStyle(0x263670, 1)
      g.lineStyle(3, tile.orientation === tile.required ? 0xffe582 : 0x6377af, 1)
      g.fillRoundedRect(-tileSize / 2, -tileSize / 2, tileSize, tileSize, 12)
      g.strokeRoundedRect(-tileSize / 2, -tileSize / 2, tileSize, tileSize, 12)
      g.lineStyle(Math.max(6, tileSize * .11), 0xeff4ff, 1)
      g.beginPath()
      if (tile.orientation === 0) { g.moveTo(-tileSize * .32, 0); g.lineTo(tileSize * .32, 0) }
      else { g.moveTo(0, -tileSize * .32); g.lineTo(0, tileSize * .32) }
      g.strokePath()
      box.add(g)
      box.setSize(tileSize, tileSize).setInteractive({ useHandCursor: true })
      box.on('pointerdown', () => {
        tile.orientation = tile.orientation === 0 ? 1 : 0
        this.moves += 1
        this.setStatus('قطعه چرخید؛ مسیر را دوباره بررسی کن')
        this.updateHud()
        this.drawBoard()
      })
      tile.sprite = box
      this.board.add(box)
    }
  }

  private drawNode(x: number, y: number, color: number, label: string) {
    const ring = this.add.graphics()
    ring.fillStyle(0x14234c, 1)
    ring.lineStyle(5, color, 1)
    ring.fillCircle(x, y, 30)
    ring.strokeCircle(x, y, 30)
    this.board?.add(ring)

    const text = this.add.text(x, y + 54, label, {
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      fontSize: '20px',
      color: '#eff4ff',
      align: 'center'
    }).setOrigin(.5)
    this.board?.add(text)
  }

  private isSolved() { return this.tiles.every(tile => tile.orientation === tile.required) }

  private sendPulse() {
    if (this.isSolved()) this.setStatus('عالی! ستاره روشن شد و مرحله کامل است.')
    else this.setStatus('پالس به مقصد نرسید؛ جهت قطعه‌ها را بررسی کن.')
    this.drawBoard()
  }

  private hint() {
    const tile = this.tiles.find(item => item.orientation !== item.required)
    if (!tile) { this.setStatus('همهٔ قطعه‌ها درست‌اند؛ پالس را ارسال کن.'); return }
    tile.orientation = tile.required
    this.moves += 1
    this.setStatus('یک قطعهٔ درست روشن شد؛ ۲۵ امتیاز از پاداش کم می‌شود.')
    this.updateHud()
    this.drawBoard()
  }

  private setStatus(message: string) {
    const el = document.querySelector('#statusLabel')
    if (el) el.textContent = message
  }

  private updateHud() {
    const moves = document.querySelector('#movesLabel')
    const stage = document.querySelector('#stageLabel')
    if (moves) moves.textContent = `حرکت: ${faDigits(this.moves)}`
    if (stage) stage.textContent = `مرحله ${faDigits(this.stage)}`
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#121b41',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: NeyroScene,
  render: { antialias: true, pixelArt: false }
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined))
}
