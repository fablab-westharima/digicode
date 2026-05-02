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

// ===== Math overrides (Round 1 cluster #7 RCA) =====
// Stock JS generator emits `Math.min/max/round/floor/ceil/...` which Arduino
// C++ does not have (C++ uses bare `min`/`max` macros + math.h functions).
// Override the affected blocks to emit Arduino-friendly equivalents.

javascriptGenerator.forBlock['math_constrain'] = function (block: Blockly.Block) {
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.NONE) || '0';
  const low = javascriptGenerator.valueToCode(block, 'LOW', Order.NONE) || '0';
  const high = javascriptGenerator.valueToCode(block, 'HIGH', Order.NONE) || 'INFINITY';
  // Arduino macro: constrain(x, low, high) clamps x to [low, high].
  return [`constrain(${value}, ${low}, ${high})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['math_round'] = function (block: Blockly.Block) {
  const op = block.getFieldValue('OP'); // ROUND / ROUNDUP / ROUNDDOWN
  const num = javascriptGenerator.valueToCode(block, 'NUM', Order.NONE) || '0';
  const fn = op === 'ROUNDUP' ? 'ceil' : op === 'ROUNDDOWN' ? 'floor' : 'round';
  return [`${fn}(${num})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['math_single'] = function (block: Blockly.Block) {
  const op = block.getFieldValue('OP');
  const num = javascriptGenerator.valueToCode(block, 'NUM', Order.NONE) || '0';
  const map: Record<string, string> = {
    ROOT: 'sqrt', ABS: 'abs', LN: 'log', LOG10: 'log10', EXP: 'exp',
    POW10: 'pow(10, %)', SIN: 'sin', COS: 'cos', TAN: 'tan',
    ASIN: 'asin', ACOS: 'acos', ATAN: 'atan',
  };
  if (op === 'NEG') return [`-(${num})`, Order.UNARY_NEGATION];
  const tpl = map[op];
  if (!tpl) return [`(${num})`, Order.NONE]; // unknown op → passthrough
  if (tpl.includes('%')) return [tpl.replace('%', num), Order.FUNCTION_CALL];
  return [`${tpl}(${num})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock['math_modulo'] = function (block: Blockly.Block) {
  const dividend = javascriptGenerator.valueToCode(block, 'DIVIDEND', Order.MODULUS) || '0';
  const divisor = javascriptGenerator.valueToCode(block, 'DIVISOR', Order.MODULUS) || '1';
  return [`(${dividend} % ${divisor})`, Order.MODULUS];
};

javascriptGenerator.forBlock['math_random_int'] = function (block: Blockly.Block) {
  const from = javascriptGenerator.valueToCode(block, 'FROM', Order.NONE) || '0';
  const to = javascriptGenerator.valueToCode(block, 'TO', Order.NONE) || '100';
  // Arduino random(min, max) returns [min, max-1]; add 1 to upper to be inclusive
  // matching Blockly's "random integer from a to b" semantics.
  return [`random(${from}, (${to}) + 1)`, Order.FUNCTION_CALL];
};
