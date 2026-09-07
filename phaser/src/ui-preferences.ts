export {}

type ThemeChoice = 'dark' | 'light' | 'system'
type Locale = 'fa' | 'en'

const themeSelect = document.querySelector<HTMLSelectElement>('#themeSelect')
const themeText = document.querySelector<HTMLElement>('#themeText')
const missionKicker = document.querySelector<HTMLElement>('#missionKicker')
const advancedSummary = document.querySelector<HTMLElement>('#advancedSummary')
const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
const media = window.matchMedia('(prefers-color-scheme: dark)')

const labels = {
  fa: {
    theme: 'حالت نمایش', dark: 'تیره', light: 'روشن', system: 'سیستم',
    mission: 'هدف مرحله', advanced: 'انتخاب فصل و مرحله'
  },
  en: {
    theme: 'Appearance', dark: 'Dark', light: 'Light', system: 'System',
    mission: 'Stage objective', advanced: 'Chapter & stage selection'
  }
} as const

function locale(): Locale { return document.documentElement.lang === 'en' ? 'en' : 'fa' }
function storedTheme(): ThemeChoice {
  const stored = localStorage.getItem('neyro.theme') as ThemeChoice | null
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system'
}
function resolvedTheme(choice: ThemeChoice): 'dark' | 'light' {
  return choice === 'system' ? (media.matches ? 'dark' : 'light') : choice
}
function applyTheme(choice: ThemeChoice) {
  const resolved = resolvedTheme(choice)
  document.body.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  if (themeColorMeta) themeColorMeta.content = resolved === 'dark' ? '#080d24' : '#f4f7fb'
  if (themeSelect) themeSelect.value = choice
  window.dispatchEvent(new CustomEvent('neyro:themechange', { detail: { choice, resolved } }))
}
function applyLanguageChrome() {
  const c = labels[locale()]
  if (themeText) themeText.textContent = c.theme
  if (themeSelect) {
    themeSelect.setAttribute('aria-label', c.theme)
    const [dark, light, system] = Array.from(themeSelect.options)
    if (dark) dark.text = c.dark
    if (light) light.text = c.light
    if (system) system.text = c.system
  }
  if (missionKicker) missionKicker.textContent = c.mission
  if (advancedSummary) advancedSummary.textContent = c.advanced
}

let current = storedTheme()
applyTheme(current)
applyLanguageChrome()

themeSelect?.addEventListener('change', () => {
  current = themeSelect.value as ThemeChoice
  localStorage.setItem('neyro.theme', current)
  applyTheme(current)
})

media.addEventListener('change', () => { if (current === 'system') applyTheme(current) })

const languageObserver = new MutationObserver(() => applyLanguageChrome())
languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] })
