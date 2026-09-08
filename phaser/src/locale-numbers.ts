export {}

const FA = '۰۱۲۳۴۵۶۷۸۹'
const AR = '٠١٢٣٤٥٦٧٨٩'

const stageInput = document.querySelector<HTMLInputElement>('#stageInput')
const loadButton = document.querySelector<HTMLButtonElement>('#loadButton')
const localeButton = document.querySelector<HTMLButtonElement>('#localeButton')
const stageLabel = document.querySelector<HTMLElement>('#stageLabel')
const ageSelect = document.querySelector<HTMLSelectElement>('#ageSelect')

function locale() { return document.documentElement.lang === 'en' ? 'en' : 'fa' }
function toAscii(value: string) {
  return value
    .replace(/[۰-۹]/g, d => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(AR.indexOf(d)))
}
function toPersian(value: string) { return value.replace(/\d/g, d => FA[Number(d)]) }
function displayDigits(value: string) { return locale() === 'fa' ? toPersian(toAscii(value)) : toAscii(value) }

function syncAgeOptions() {
  if (!ageSelect) return
  const fa = locale() === 'fa'
  const labels = fa ? ['۵–۸', '۹–۱۷', '۱۸+'] : ['5–8', '9–17', '18+']
  Array.from(ageSelect.options).forEach((option, index) => { if (labels[index]) option.text = labels[index] })
}

function syncStageInput() {
  if (!stageInput || document.activeElement === stageInput) return
  stageInput.value = displayDigits(stageInput.value || '1')
  stageInput.setAttribute('aria-valuetext', stageInput.value)
}

function sync() {
  syncAgeOptions()
  syncStageInput()
}

stageInput?.addEventListener('input', () => {
  const normalized = toAscii(stageInput.value).replace(/[^0-9]/g, '')
  stageInput.value = locale() === 'fa' ? toPersian(normalized) : normalized
})
stageInput?.addEventListener('blur', syncStageInput)

loadButton?.addEventListener('click', () => {
  if (!stageInput) return
  stageInput.value = toAscii(stageInput.value)
  queueMicrotask(syncStageInput)
}, { capture: true })

localeButton?.addEventListener('click', () => queueMicrotask(sync))

const observer = new MutationObserver(sync)
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] })
if (stageLabel) observer.observe(stageLabel, { childList: true, subtree: true, characterData: true })

sync()
