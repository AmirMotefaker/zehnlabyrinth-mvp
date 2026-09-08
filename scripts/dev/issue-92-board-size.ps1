$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $repo

if ((git branch --show-current) -ne 'feat/92-scale-v2') { throw 'Expected feat/92-scale-v2 branch.' }
if (git status --porcelain) { throw 'Working tree must be clean before running this patch.' }

$index  = Join-Path $repo 'phaser\index.html'
$main   = Join-Path $repo 'phaser\src\main.ts'
$engine = Join-Path $repo 'phaser\src\core\stage-engine.ts'
$css    = Join-Path $repo 'phaser\src\world-class.css'

function Replace-Once([string]$text, [string]$old, [string]$new, [string]$label) {
  if ($text.Contains($new)) { return $text }
  if (-not $text.Contains($old)) { throw "Anchor not found: $label" }
  return $text.Replace($old, $new)
}

Write-Host "`n=== ISSUE #92 BOARD SIZE 3x3..50x50 ===" -ForegroundColor Cyan
Write-Host 'Main/Production untouched.' -ForegroundColor Green

# index.html
$html = Get-Content $index -Raw -Encoding UTF8
$old = '<label class="control-card"><span id="chapterText">فصل</span><select id="chapterSelect"></select></label>'
$new = @'
<label class="control-card"><span id="chapterText">فصل</span><select id="chapterSelect"></select></label>
        <label class="control-card board-size-control"><span id="boardSizeText">اندازه صفحه</span><select id="boardSizeSelect" aria-label="اندازه صفحه"></select></label>
'@.TrimEnd()
if (-not $html.Contains('id="boardSizeSelect"')) { $html = Replace-Once $html $old $new 'index board-size control' }
Set-Content $index $html -Encoding UTF8 -NoNewline

# stage-engine.ts
$eng = Get-Content $engine -Raw -Encoding UTF8
$eng = Replace-Once $eng `
  'export function generateStage(track: TrackDefinition, stageNumber: number): StageDefinition {' `
  'export function generateStage(track: TrackDefinition, stageNumber: number, requestedBoardSize?: number): StageDefinition {' `
  'generateStage signature'

$oldTrack = '  const stageTrack: TrackDefinition = { ...track, boardSize: boardSizeFor(track, chapter) }'
$newTrack = @'
  const canonicalBoardSize = boardSizeFor(track, chapter)
  const selectedBoardSize = requestedBoardSize == null
    ? canonicalBoardSize
    : Math.min(50, Math.max(3, Math.round(requestedBoardSize)))
  const stageTrack: TrackDefinition = { ...track, boardSize: selectedBoardSize }
'@.TrimEnd()
if (-not $eng.Contains('const selectedBoardSize = requestedBoardSize == null')) { $eng = Replace-Once $eng $oldTrack $newTrack 'stage-engine board-size override' }
Set-Content $engine $eng -Encoding UTF8 -NoNewline

# main.ts
$src = Get-Content $main -Raw -Encoding UTF8
$src = Replace-Once $src `
  "tagline: 'هزارتوی ذهن · شبکهٔ نور', age: 'رده سنی', difficulty: 'سختی', chapter: 'فصل', stage: 'مرحله'," `
  "tagline: 'هزارتوی ذهن · شبکهٔ نور', age: 'رده سنی', difficulty: 'سختی', chapter: 'فصل', stage: 'مرحله', boardSize: 'اندازه صفحه'," `
  'fa board-size copy'
$src = Replace-Once $src `
  "tagline: 'Mind Labyrinth · Living Light Network', age: 'Age', difficulty: 'Difficulty', chapter: 'Chapter', stage: 'Stage'," `
  "tagline: 'Mind Labyrinth · Living Light Network', age: 'Age', difficulty: 'Difficulty', chapter: 'Chapter', stage: 'Stage', boardSize: 'Board size'," `
  'en board-size copy'

$oldDifficulty = "  private difficulty: Difficulty = (localStorage.getItem('neyro.difficulty') as Difficulty) || 'easy'"
$newDifficulty = $oldDifficulty + "`n  private boardSizeOverride = Math.min(50, Math.max(3, Number(localStorage.getItem('neyro.boardSize') || 0)))"
if (-not $src.Contains('private boardSizeOverride')) { $src = Replace-Once $src $oldDifficulty $newDifficulty 'board size state' }

$oldStageInput = "    const stageInput = el<HTMLInputElement>('#stageInput')"
$newStageInput = @'
    const stageInput = el<HTMLInputElement>('#stageInput')
    const boardSizeSelect = el<HTMLSelectElement>('#boardSizeSelect')
    boardSizeSelect.replaceChildren()
    for (let size = 3; size <= 50; size += 1) {
      const option = document.createElement('option')
      option.value = String(size)
      boardSizeSelect.append(option)
    }
'@.TrimEnd()
if (-not $src.Contains('boardSizeSelect.replaceChildren()')) { $src = Replace-Once $src $oldStageInput $newStageInput 'board-size options' }

$oldLoad = @'
      this.ageBand = el<HTMLSelectElement>('#ageSelect').value as AgeBand
      this.difficulty = el<HTMLSelectElement>('#difficultySelect').value as Difficulty
'@.TrimEnd()
$newLoad = @'
      this.ageBand = el<HTMLSelectElement>('#ageSelect').value as AgeBand
      this.difficulty = el<HTMLSelectElement>('#difficultySelect').value as Difficulty
      this.boardSizeOverride = Number(boardSizeSelect.value)
      localStorage.setItem('neyro.boardSize', String(this.boardSizeOverride))
'@.TrimEnd()
if (-not $src.Contains('this.boardSizeOverride = Number(boardSizeSelect.value)')) { $src = Replace-Once $src $oldLoad $newLoad 'load board-size selection' }

if (-not $src.Contains('generateStage(this.currentTrack(), this.stageNumber, this.boardSizeOverride || undefined)')) {
  $src = Replace-Once $src `
    '    this.stage = generateStage(this.currentTrack(), this.stageNumber)' `
    '    this.stage = generateStage(this.currentTrack(), this.stageNumber, this.boardSizeOverride || undefined)' `
    'generateStage board-size arg'
}

$oldValues = "'#tagline': c.tagline, '#ageText': c.age, '#difficultyText': c.difficulty, '#chapterText': c.chapter, '#stageText': c.stage,"
$newValues = "'#tagline': c.tagline, '#ageText': c.age, '#difficultyText': c.difficulty, '#chapterText': c.chapter, '#stageText': c.stage, '#boardSizeText': c.boardSize,"
if (-not $src.Contains("'#boardSizeText': c.boardSize")) { $src = Replace-Once $src $oldValues $newValues 'locale board-size label' }

$chapterLine = ($src -split "`n" | Where-Object { $_ -match 'CHAPTERS_PER_TRACK.*chapterSelect.*options\[i\]\.text' } | Select-Object -First 1)
if (-not $chapterLine) { throw 'Anchor not found: chapter option localization' }
if (-not $src.Contains('Array.from(boardSizeSelect.options)')) {
  $boardLocalize = @'
    const boardSizeSelect = el<HTMLSelectElement>('#boardSizeSelect')
    Array.from(boardSizeSelect.options).forEach(option => {
      const n = Number(option.value)
      option.text = `${digits(n, this.locale)}×${digits(n, this.locale)}`
    })
'@.TrimEnd()
  $block = $chapterLine + "`n" + $boardLocalize
  $src = Replace-Once $src $chapterLine $block 'board-size option localization'
}

$oldDiffValue = "    el<HTMLSelectElement>('#difficultySelect').value = this.difficulty"
$newDiffValue = $oldDiffValue + "`n    boardSizeSelect.value = String(this.boardSizeOverride || this.stage?.track.boardSize || 4)"
if (-not $src.Contains('boardSizeSelect.value = String')) { $src = Replace-Once $src $oldDiffValue $newDiffValue 'board-size selected value' }

$oldLock = "    el<HTMLSelectElement>('#chapterSelect').disabled = locked"
$newLock = $oldLock + "`n    el<HTMLSelectElement>('#boardSizeSelect').disabled = locked"
if (-not $src.Contains("el<HTMLSelectElement>('#boardSizeSelect').disabled = locked")) { $src = Replace-Once $src $oldLock $newLock 'board-size lock state' }

Set-Content $main $src -Encoding UTF8 -NoNewline

# world-class.css
$style = Get-Content $css -Raw -Encoding UTF8
if (-not $style.Contains('.board-size-control select')) {
  $style += @'


.board-size-control select {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1250px) {
  .world-topbar {
    grid-template-columns: repeat(5, minmax(110px, 1fr)) auto auto;
  }
}

@media (max-width: 820px) {
  .world-topbar .board-size-control {
    display: flex;
  }
}
'@
}
Set-Content $css $style -Encoding UTF8 -NoNewline

Write-Host "`n=== VALIDATE ===" -ForegroundColor Cyan
Push-Location (Join-Path $repo 'phaser')
try {
  npm ci
  npm run typecheck
  npm run catalog:audit
  npm run runtime:audit
  npm run build
} finally { Pop-Location }

Write-Host "`n=== COMMIT + PUSH ===" -ForegroundColor Cyan
git add phaser/index.html phaser/src/main.ts phaser/src/core/stage-engine.ts phaser/src/world-class.css
git commit -m 'feat(scale): add selectable 3x3 to 50x50 board sizes'
git push origin feat/92-scale-v2

Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
git log -1 --oneline
