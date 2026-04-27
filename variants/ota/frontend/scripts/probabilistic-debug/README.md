# Probabilistic Debug

Internal QA tool for DigiCode block compilation coverage.

**Plan document:** `prompt/maintenance/43_2026-04-28_確率ベースデバッグ計画_Wave3新規5.md`

## Status

🚧 **Phase 1 (foundation) — in progress (2026-04-28)**

| Step | File | Status |
|------|------|--------|
| 1a/1c | `lib/catalog-types.ts` | ✅ |
| 1c    | `lib/catalog.ts` (loader + filters + hash) | ✅ |
| 1d    | `lib/xml-builder.ts` (Blockly XML emitter) | ✅ |
| 1g    | `lib/xml-builder.test.ts` + `lib/catalog.test.ts` | ✅ |
| 1e    | `generate-cases.ts` (singleton/template/pair/matrix/edge) | ⏳ |
| 1f    | unit test for generated XML catalog conformance | ⏳ |

Phase 2 (orchestrator), Phase 3 (analyzer), Phase 4 (UAT) will follow per 43.md §5.

## Run tests

```bash
cd variants/ota/frontend
npx vitest run scripts/probabilistic-debug/
```

## Layout

```
scripts/probabilistic-debug/
├── README.md
└── lib/
    ├── catalog-types.ts        # Mirrors block-catalog.json shape
    ├── catalog.ts              # Loader + mode/board filters + SHA-256 hash
    ├── catalog.test.ts         # Smoke against real catalog (414 blocks)
    ├── xml-builder.ts          # Blockly workspace XML emitter
    └── xml-builder.test.ts     # Shape, escaping, root-coords-only tests
```

## Future

Phase 2-4 add: case generator, ML30 compile orchestrator, failure clustering, Markdown report. Generated XMLs and reports go under `scripts/probabilistic-debug-cases/` and `scripts/probabilistic-debug-reports/` (both `.gitignore`'d, see 43.md §4.2).
