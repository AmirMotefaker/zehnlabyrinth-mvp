# NEYRO

A bilingual, cross-platform spatial-light puzzle game built in Godot, with a standalone Web prototype maintained in parallel during the migration period.

## Play online

| Surface | Link | Purpose |
| --- | --- | --- |
| 🎮 Godot Web/PWA | https://amirmotefaker.github.io/zehnlabyrinth-mvp/ | Canonical Godot gameplay preview |
| 🌐 Standalone Web | https://amirmotefaker.github.io/zehnlabyrinth-mvp/legacy/ | Web parity/reference build |

> Both links are published from the same GitHub Pages release workflow. The `/legacy/` surface remains available while the Godot-only migration in Roadmap #29 is being completed.

## Product direction

NEYRO is a mobile-first neural-light puzzle game for Web, Android and iOS. The long-term runtime source of truth is Godot 4.x. Until the Godot migration gate is complete, the standalone Web implementation remains a maintained parity surface rather than an abandoned prototype.

## Persian / RTL contract

- Persian UI uses right-to-left layout and advanced complex-text shaping.
- Persian player-facing numbers use Persian digits.
- Godot uses a Persian-capable font stack (`Vazirmatn` → `Tahoma` → `Noto Sans Arabic` → system fallback) instead of relying only on the engine fallback font.
- Web uses Vazirmatn and the same semantic visual palette.
- Gameplay coordinates are never mirrored; UI controls and text are mirrored/RTL-safe.

## Visual system

Semantic tokens are shared conceptually across both surfaces:

- `background`: `#080d24`
- `surface`: `#121b41`
- `primary`: `#58e3dd`
- `energy`: `#6feae4`
- `accent`: `#9278ff`
- `warning`: `#ffb55c`
- `success`: `#ffe582`
- `text`: `#eff4ff`
- `muted text`: `#b9c9ef`

Godot owns these tokens in `godot/ui/neyro_theme.gd`; the standalone Web implementation mirrors them in `index.html`.

## Parallel update rule

For every user-visible gameplay, UI, copy, scoring, progression, localisation or accessibility change during the migration period:

- [ ] Godot parity verified
- [ ] Web parity verified
- [ ] Persian RTL verified
- [ ] English/LTR impact reviewed when applicable
- [ ] Mobile portrait checked
- [ ] Desktop/Web checked
- [ ] GitHub Issue → branch → commits → PR → CI → release notes recorded

Godot-only infrastructure changes such as export tooling, engine upgrades or native packaging do not require a standalone Web code change, but must still preserve the Web surface.

## Current work

- Global roadmap: #29
- Persian typography + visual parity correction: #35

## Repository layout

- `godot/` — canonical Godot runtime, game rules, generated levels and exports
- `index.html` — standalone Web parity/reference implementation
- `.github/workflows/godot-verify.yml` — Godot validation
- `.github/workflows/godot-web-pwa.yml` — builds Godot Web/PWA and publishes both online surfaces

## Release safety

Production-facing publication happens only after CI and preview/device QA. Development changes must not disrupt an already-working live surface.
