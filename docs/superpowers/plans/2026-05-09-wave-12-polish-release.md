# Wave 12 — Polish & Release Implementation Plan (FINAL)

**Predecessor:** Wave 11 (Benchmarks) — `v0.14.0-canary.wave11`, 1369 tests.
**Goal:** Final polish pass + 1.0.0 cut.

## Tasks

1. **Audit all doc placeholders.** Find any remaining MDX pages whose content is still the auto-generated stub (look for the `> **Status:** Placeholder` blockquote). Fill them in or mark them as intentional "see also" stubs.

2. **Examples README polish.** Each cluster app under `examples/` gets a polished README: 1-paragraph description, prerequisites, `bun run dev` quickstart, key concepts demonstrated, link to relevant docs.

3. **Top-level repo README.** Replace or create `/Users/nosyn/personal/banhmi/README.md` with: marquee numbers (cold-start 154 ms, RSS 63 MB), quickstart, installation, links to docs site + master spec + roadmap, license, badges.

4. **Landing page.** Update `apps/docs/apps/web/src/routes/index.tsx` (or whatever the docs index is) with hero copy referencing the marquee numbers and feature list.

5. **Doc-site link checker.** Run a quick scan to find broken `[link](path)` references in MDX. Fix or remove.

6. **Changelog.** Generate `CHANGELOG.md` at the repo root summarizing each wave (use the wave summary docs as source). Manual or scripted.

7. **1.0.0-rc.1 cut.** Bump every public package to `1.0.0-rc.1`. Update workspace deps (`workspace:*` stays the same; the published versions go to 1.0.0-rc.1). Tag `v1.0.0-rc.1`.

8. **Soak window note.** Document the soak window in the wave summary; the actual GA is `v1.0.0` after a 7-day soak with no critical bugs (a manual decision).

9. **Verification gate** (final).

## Working order

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Commit per task.
