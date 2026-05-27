/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * scrubNakedValue override (Session 158 主軸 1 = case_0447/0584 構造対策 Option A)
 *
 * Blockly default `return a+";\n"` は setCheck reject で detach した orphan
 * value block (math_number / array_content 等) を file scope に `0;` /
 * `{0,0,0};` 形式で emit、 C++ syntax error 化 (singleton strategy 経由
 * 1000-case で fail produce、 case 20 cluster の symptom)。 本 override で
 * orphan を comment 化 = file scope safe + debug visibility 維持、 generator
 * 層で全 reject 型を構造的予防 (= 同 cluster 今後 0 件継続予防)。
 *
 * production user pattern では Blockly UX (= statement のみ top-level UX) で
 * top-level value 配置は稀、 副作用 minimal。
 *
 * Must be imported by BOTH:
 *   1. `src/components/editor/BlocklyEditor.tsx` (= production browser)
 *   2. `scripts/probabilistic-debug/lib/blocks-bootstrap.ts` (= headless
 *      orchestrator 経由 1000-case run 等の cpp 生成 path)
 * single javascriptGenerator instance への side-effect import = 一元管理 +
 * drift 構造的予防 (= rule 06 「3-in-1 commit rule」 視認性 = file 名で
 * 機能自明)。
 */

import { javascriptGenerator } from 'blockly/javascript';

javascriptGenerator.scrubNakedValue = function (line: string) {
  return '/* orphan: ' + line.trim() + ' */\n';
};
