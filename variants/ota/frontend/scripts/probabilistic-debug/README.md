# Probabilistic Debug

Internal QA tool for DigiCode block compilation coverage.

**Plan document:** `prompt/maintenance/43_2026-04-28_確率ベースデバッグ計画_Wave3新規5.md`

## Status

✅ **Phase 1 (use-case generator) — complete** (commit `0bec25d`, 2026-04-28)
✅ **Phase 2 (compile orchestrator) — complete** (commit `8b031b9`, 2026-04-28)
⏸ **Phase 3 (failure analyzer + report) — next**
⏸ **Phase 4 (1000-case run + UAT) — pending Phase 3**

**Compile server:** PlatformIO Core (ML30 Docker `digicode-compile-api`, `compile.digital-fab.jp`) — arduino-cli は 44.md+45.md で廃止済。orchestrator はそのまま動作。

**PIO baseline (60-case):** `scripts/probabilistic-debug-results/2026-04-28_15-00_p3_full60_pio-new` — passRate=58.3%

**Generated cases:** `scripts/probabilistic-debug-cases/2026-04-28_12-02/` (1000 XML, reusable)

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | `lib/catalog-types.ts` / `catalog.ts` / `xml-builder.ts` | ✅ |
| 1 | `lib/case-types.ts` / `case-helpers.ts` / `synthesize-block.ts` / `primitive-fillers.ts` / `case-validator.ts` | ✅ |
| 1 | `lib/strategies/{singleton,edge,matrix,pair,template}.ts` | ✅ |
| 1 | `generate-cases.ts` CLI + `generate-cases.test.ts` | ✅ |
| 2 | `orchestrator.ts` (parallel worker pool, noise-test mode) | ✅ |
| 2 | `lib/compile-client.ts` (POST /api/compile, retry, timeout 180s) | ✅ |
| 2 | `lib/result-store.ts` (results.jsonl + results.json + metadata.json) | ✅ |
| 3 | `analyze-failures.ts` (cluster by error pattern) | ⏸ |
| 3 | `render-report.ts` (Markdown report renderer) | ⏸ |
| 3 | `lib/report-builder.ts` | ⏸ |
| 4 | 1000-case full run + UAT | ⏸ |

## Generate cases

```bash
cd variants/ota/frontend

# Full 1000-case run (default output: scripts/probabilistic-debug-cases/<timestamp>/)
npx tsx scripts/probabilistic-debug/generate-cases.ts

# Smaller smoke run with explicit output dir
npx tsx scripts/probabilistic-debug/generate-cases.ts --count 100 --out /tmp/smoke

# Help
npx tsx scripts/probabilistic-debug/generate-cases.ts --help
```

Strategy allocation at `--count 1000`:

| Strategy | Cases | Coverage |
|----------|------:|----------|
| singleton | 414 | Every catalog block in isolation, in arduino_setup or arduino_loop. |
| edge      |  86 | Number boundary (min/max) + dropdown enum sweep + deeply nested. |
| matrix    | 100 | Mode × board representative blocks (round-robin across 7 modes). |
| pair      | 200 | Init+use auto-derived from naming convention + control-flow + comm pairs. |
| template  | 200 | sampleProjects.ts (37 entries) × PIN/BAUD/NUM sweeps. Elastic — absorbs shortfall from earlier strategies so the total always equals `--count`. |

Output:
- `case_NNNN.xml` — one Blockly workspace XML per case (POST-able to `/api/compile`).
- `manifest.json` — generator git SHA + catalog SHA-256 + per-case (id, strategy, mode, boardId, blocksUsed, fileName).

Output directories are git-ignored (`scripts/probabilistic-debug-{cases,results,reports}/`).

## Run tests

```bash
cd variants/ota/frontend

# Full suite (probabilistic-debug only)
npx vitest run scripts/probabilistic-debug/

# Includes the count=1000 catalog-conformance integration test
npx vitest run scripts/probabilistic-debug/generate-cases.test.ts
```

## Layout

```
scripts/probabilistic-debug/
├── README.md
├── generate-cases.ts            # CLI entry + buildAllCases + allocate
├── generate-cases.test.ts       # count=100 smoke + count=1000 catalog conformance
└── lib/
    ├── catalog-types.ts         # Mirrors block-catalog.json shape
    ├── catalog.ts               # Loader + mode/board filters + SHA-256 hash
    ├── catalog.test.ts          # Smoke against the real catalog (414 blocks)
    ├── case-types.ts            # GeneratedCase / Manifest shapes
    ├── case-helpers.ts          # pickMode/pickBoard/wrapForCompilability/collectBlockTypes
    ├── case-helpers.test.ts
    ├── primitive-fillers.ts     # math_number / text / logic_boolean / tft_color_rgb fillers
    ├── primitive-fillers.test.ts
    ├── synthesize-block.ts      # Field defaults + value-input filling
    ├── synthesize-block.test.ts
    ├── case-validator.ts        # validateRoots: catalog conformance walker
    ├── case-validator.test.ts
    ├── xml-builder.ts           # Blockly workspace XML emitter
    ├── xml-builder.test.ts
    └── strategies/
        ├── singleton.ts
        ├── singleton.test.ts
        ├── edge.ts
        ├── edge.test.ts
        ├── matrix.ts
        ├── matrix.test.ts
        ├── pair.ts
        ├── pair.test.ts
        ├── template.ts
        └── template.test.ts
```

## Run orchestrator (Phase 2 — already implemented)

```bash
cd variants/ota/frontend

# Smoke run (20 cases, verify PIO timing)
npx tsx scripts/probabilistic-debug/orchestrator.ts \
  --in scripts/probabilistic-debug-cases/2026-04-28_12-02 \
  --limit 20 --parallel 4 --verbose

# Full 1000-case run
npx tsx scripts/probabilistic-debug/orchestrator.ts \
  --in scripts/probabilistic-debug-cases/2026-04-28_12-02 \
  --parallel 4

# Help
npx tsx scripts/probabilistic-debug/orchestrator.ts --help
```

Output goes to `scripts/probabilistic-debug-results/<runId>/` (git-ignored).

## Next (Phase 3)

Implement `analyze-failures.ts` + `render-report.ts` + `lib/report-builder.ts` per 43.md §5.3. Then run Phase 4 (1000-case + UAT).
