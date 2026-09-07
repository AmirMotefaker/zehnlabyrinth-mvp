# NEYRO World-Class Game Surface v1

Approved product direction for the playable NEYRO surface.

## Desktop composition
- Brand/identity rail on the left.
- Compact player controls across the top.
- Puzzle board is the primary center surface.
- Live stats, objective, progress and track contract on the right.
- Gameplay help and mouse interaction legend remain visible without obscuring the board.

## Input contract
- Desktop left click rotates a rotatable tile 90° counter-clockwise.
- Desktop right click rotates a rotatable tile 90° clockwise and suppresses the browser context menu on the game surface.
- Touch/mobile tap rotates one direction; future gesture settings may expose alternate direction.
- Undo records either direction correctly.

## Content contract
- 3 age bands × 3 difficulty levels.
- Minimum 10,000 stages for every age-band/difficulty track = 90,000 deterministic stages.
- Board size is age-aware and difficulty-aware, with progression allowed by chapter while retaining an 8×8 mobile-safe ceiling.
- Persian and English are first-class locales.
- Dark / Light / System appearance remains selectable.

## Release gates
- TypeScript build green.
- 90,000-stage catalogue audit green: total, uniqueness, solvability and validity.
- Stateful runtime audit green.
- Responsive QA: desktop, tablet, mobile.
- No regression in save/progress/timer/completion semantics.
