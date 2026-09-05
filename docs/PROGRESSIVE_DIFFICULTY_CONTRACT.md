# NEYRO Progressive Difficulty Contract

This document is the implementation contract for Issue #58 and the age-adaptive difficulty work.

## Traceability rule

Every gameplay/UI change in this scope must be represented by:

1. GitHub Issue or issue comment with acceptance criteria
2. dedicated branch
3. focused commits
4. Pull Request with exact behavior and test evidence
5. CI gates
6. merge commit
7. deployed QA note

No gameplay change is considered complete if one of these records is missing.

## Player-facing profiles

### Age 5–8
- simplest visual hierarchy and gentlest cognitive load
- Easy remains 5×5
- Medium remains 6×6
- Hard starts smaller and grows to 7×7 in later chapters
- fewer blockers/decoys in early chapters
- advanced stateful mechanics introduced later

### Age 9–17
- Easy 5×5
- Medium 6×6, growing to 7×7 late game
- Hard 7×7, growing to 8×8 late game
- blocker/relay combinations appear earlier than in 5–8
- later chapters increase route planning and multi-step reasoning

### Age 18+
- Easy 5×5 and may grow to 6×6 late game
- Medium 6×6, growing to 7×7 mid/late game
- Hard 7×7, growing to 8×8 from mid game
- strongest multi-pulse, optimisation and stateful-mechanics pressure

## Difficulty dimensions

Difficulty must not be represented by board size alone. The generator may vary:
- board size
- blocker density
- decoy density
- mechanic introduction timing
- required pulse count
- par moves
- completion-time benchmarks

## Hard limits
- mobile-safe board-size ceiling: 8×8 for this release line
- tutorial stages 1–3 remain intentionally understandable regardless of profile
- generated stages remain deterministic
- 9,000 total / 9,000 unique / 0 unsolved / 0 invalid
- stateful runtime audit must pass

## Completion telemetry contract
Each completed stage records at least age band, difficulty, stage identity, frozen final elapsed time, move count, best time, and completion state. The result UI must visibly confirm completion before progression.
