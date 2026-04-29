/**
 * Blockly built-in block — C++ generator overrides
 *
 * Blockly's stock `javascriptGenerator` targets JavaScript, which is partially
 * incompatible with the C++ that DigiCode emits:
 *
 *   - The generator's `init` hoists `var <name>;` declarations for every
 *     workspace variable. C++ has no `var` keyword (BUG-060).
 *   - `controls_for` / `controls_repeat_ext` emit `for (i = ...; ...)` after
 *     that hoist — also relying on `var` (BUG-060).
 *   - `text` wraps the literal in single quotes, so an empty string becomes
 *     `''`, a C++ empty-character-constant error (BUG-061).
 *
 * This module re-points the affected entries to C++-safe equivalents. Loaded
 * as a side-effect import from both `BlocklyEditor.tsx` and the headless
 * `scripts/probabilistic-debug/lib/blocks-bootstrap.ts`.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// `definitions_` is exposed only at runtime; cast keeps the file typed without
// reaching into Blockly's protected surface.
type GeneratorWithDefs = {
  init?: (workspace: Blockly.Workspace) => void;
  definitions_?: Record<string, string>;
};
const gen = javascriptGenerator as unknown as GeneratorWithDefs;

const originalInit = gen.init?.bind(javascriptGenerator);

gen.init = function (workspace: Blockly.Workspace) {
  originalInit?.(workspace);
  const defs = gen.definitions_;
  if (!defs) return;
  const declared = defs['variables'];
  if (!declared) return;
  // Standard JS gen produces e.g. `var x, y, z;`. Re-emit as `int` so that
  // the program is valid C++ and `variables_set` / `variables_get` continue
  // to compile against a real declaration. Loop counter overrides below
  // emit a fresh inner `int <var>` which shadows this outer declaration —
  // gcc accepts this (warns only under -Wshadow which is off by default).
  const match = declared.match(/^var\s+(.+);\s*$/);
  if (match) {
    const names = match[1].split(/\s*,\s*/).filter(Boolean);
    defs['variables'] = names.map((name) => `int ${name} = 0;`).join('\n');
  }
};

javascriptGenerator.forBlock['controls_for'] = function (block: Blockly.Block) {
  const variable = javascriptGenerator.getVariableName(block.getFieldValue('VAR'));
  const from = javascriptGenerator.valueToCode(block, 'FROM', Order.ASSIGNMENT) || '0';
  const to = javascriptGenerator.valueToCode(block, 'TO', Order.ASSIGNMENT) || '0';
  const by = javascriptGenerator.valueToCode(block, 'BY', Order.ASSIGNMENT) || '1';
  const branch = javascriptGenerator.statementToCode(block, 'DO');
  return `for (int ${variable} = ${from}; ${variable} <= ${to}; ${variable} += ${by}) {\n${branch}}\n`;
};

javascriptGenerator.forBlock['controls_repeat_ext'] = function (block: Blockly.Block) {
  const times = javascriptGenerator.valueToCode(block, 'TIMES', Order.ASSIGNMENT) || '0';
  const branch = javascriptGenerator.statementToCode(block, 'DO');
  return `for (int count = 0; count < ${times}; count++) {\n${branch}}\n`;
};

javascriptGenerator.forBlock['text'] = function (block: Blockly.Block) {
  const value = block.getFieldValue('TEXT') ?? '';
  const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return [`"${escaped}"`, Order.ATOMIC];
};
