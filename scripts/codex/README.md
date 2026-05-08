# Codex Coordination Harness

Single JSON queue at `scripts/codex/codex.queue.json` (gitignored) lists cookie-cutter tasks the master orchestrator hands off to a Codex agent.

Task kinds:
- `scaffold` — package skeleton creation
- `docs` — bulk MDX stub generation
- `rename` — mass renames across the tree
- `wiring` — repetitive cross-package wiring
