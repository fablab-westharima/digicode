# Probabilistic Debug

Internal QA tool for DigiCode block compilation coverage.

**Plan document:** `prompt/maintenance/43_2026-04-28_確率ベースデバッグ計画_Wave3新規5.md`

## Status

✅ **Phase 1 (use-case generator) — complete**

| Step | Component | Status |
|------|-----------|--------|
| 1a/1c | `lib/catalog-types.ts` | ✅ |
| 1c    | `lib/catalog.ts` (loader + filters + hash) | ✅ |
| 1d    | `lib/xml-builder.ts` (Blockly XML emitter) | ✅ |
| 1e    | `lib/case-types.ts` / `case-helpers.ts` / `synthesize-block.ts` / `primitive-fillers.ts` / `case-validator.ts` | ✅ |
| 1e    | `lib/strategies/{singleton,edge,matrix,pair,template}.ts` (5 strategies) | ✅ |
| 1f    | `generate-cases.ts` CLI + `generate-cases.test.ts` integrity assertions | ✅ |

Phase 2 (orchestrator), Phase 3 (analyzer), Phase 4 (UAT) follow per 43.md §5.

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

## Future

Phase 2–4 add: ML30 compile orchestrator (parallel POST), failure clustering, Claude-Code in-session RCA, Markdown report renderer. Generated XMLs / results / reports go under `scripts/probabilistic-debug-{cases,results,reports}/` (all `.gitignore`'d, see 43.md §4.2).
