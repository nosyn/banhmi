# Banhmi Supremacy Programme — Historical Record

This directory holds the design specs, wave summaries, and audit documents from
the **13-wave Banhmi Supremacy programme** (Waves 0–12) that shipped as
`v1.0.0-rc.1`.

## Structure

```
specs/      Design docs, wave summaries, and post-wave audits — KEPT permanently.
templates/  Orchestration prompts for future development waves — KEPT for reuse.
plans/      Step-by-step implementation plans — REMOVED after shipping (dead weight).
```

## What is here

### `specs/` — durable records

| File | Contents |
|------|----------|
| `2026-05-03-banhmi-design.md` | Original Banhmi architecture design |
| `2026-05-04-banhmi-full-roadmap-design.md` | Pre-programme full roadmap |
| `2026-05-08-banhmi-supremacy-master-design.md` | Master programme design (all 13 waves) |
| `2026-05-09-wave-{0-12}-summary.md` | Per-wave shipping summaries |
| `2026-05-09-wave-{1,2,3,4,5}-design.md` | Wave-level design specs |
| `2026-05-09-wave-0-anys-followup.md` | Post-Wave-0 `any` audit (resolved in Wave 10) |
| `2026-05-09-wave-10-security-audit.md` | Security audit performed in Wave 10 |
| `2026-05-09-bun-native-audit.md` | Bun-native API usage audit |

### `templates/`

- `feature-agent-prompt.md` — reusable agent orchestration prompt template for
  future development waves.

## Wave → Tag mapping

| Wave | Canary tag | Summary |
|------|-----------|---------|
| 0 | `v0.3.0-canary.wave0` | wave-0-summary.md |
| 1 | `v0.4.0-canary.wave1` | wave-1-summary.md |
| 2 | `v0.5.0-canary.wave2` | wave-2-summary.md |
| 3 | `v0.6.0-canary.wave3` | wave-3-summary.md |
| 4 | `v0.7.0-canary.wave4` | wave-4-summary.md |
| 5 | `v0.8.0-canary.wave5` | wave-5-summary.md |
| 6 | `v0.9.0-canary.wave6` | wave-6-summary.md |
| 7 | `v0.10.0-canary.wave7` | wave-7-summary.md |
| 8 | `v0.11.0-canary.wave8` | wave-8-summary.md |
| 9 | `v0.12.0-canary.wave9` | wave-9-summary.md |
| 10 | `v0.13.0-canary.wave10` | wave-10-summary.md |
| 11 | `v0.14.0-canary.wave11` | wave-11-summary.md |
| 12 | `v1.0.0-rc.1` (polish/release) | wave-12-summary.md |
