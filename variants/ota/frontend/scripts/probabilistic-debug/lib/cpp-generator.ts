/**
 * cpp-generator.ts
 *
 * Headless equivalent of `EditorPage.tsx` compile-prep:
 *   1. Parse Blockly workspace XML into a (non-rendering) `Blockly.Workspace`.
 *   2. Run `javascriptGenerator.workspaceToCode` to produce a single C++ string.
 *   3. Reapply the `setups_` injection EditorPage performs after `workspaceToCode`.
 *   4. Split the full C++ into `{ includes, globals, setupCode, loopCode }`,
 *      matching the contract that `compileService.compile` posts to
 *      `/api/compile` on the arduino-compile-server.
 *
 * The split logic is duplicated verbatim from `EditorPage.tsx` so a regression
 * on either side stays detectable.
 */

import './blocks-bootstrap';

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// Generator exposes `definitions_` / `setups_` only at runtime; the type
// surface keeps them protected, hence the cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gen = javascriptGenerator as any;

export interface CompileFragments {
  /** Full generated C++ (includes + globals + setup + loop). */
  fullCode: string;
  /** All `#include` lines, joined with '\n'. */
  includes: string;
  /** Anything between the start of the file and `void setup()`, minus includes. */
  globals: string;
  /** Body of `void setup()` (excluding the outer braces). */
  setupCode: string;
  /** Body of `void loop()` (excluding the outer braces). */
  loopCode: string;
}

/**
 * Convert a Blockly workspace XML string to the 4-fragment shape consumed by
 * `POST /api/compile`. Throws on parse / generation errors so callers can
 * record the case as a "generator failure" distinct from a compile failure.
 */
export function xmlToCpp(xml: string): CompileFragments {
  const workspace = new Blockly.Workspace();
  try {
    const dom = Blockly.utils.xml.textToDom(xml);
    Blockly.Xml.domToWorkspace(dom, workspace);

    gen.definitions_ = {};
    gen.setups_ = {};

    let code: string = gen.workspaceToCode(workspace);

    if (gen.setups_ && Object.keys(gen.setups_).length > 0) {
      const setupsCode = Object.values(gen.setups_).join('\n');
      code = code.replace(
        /void setup\(\) \{\n/,
        `void setup() {\n${setupsCode}\n`,
      );
    }

    return splitFragments(code);
  } finally {
    workspace.dispose();
  }
}

/** Mirrors EditorPage.tsx — keep both copies in sync. */
function splitFragments(fullCode: string): CompileFragments {
  const includeLines = fullCode.match(/^#include\s+.+$/gm) ?? [];
  const includes = includeLines.join('\n');

  const setupCode = extractFunctionBody(fullCode, 'setup');
  const loopCode = extractFunctionBody(fullCode, 'loop');

  const setupMatch = fullCode.match(/void setup\(\)/);
  const globals = setupMatch
    ? fullCode
        .substring(0, setupMatch.index ?? 0)
        .replace(/^#include\s+.+$\n?/gm, '')
        .trim()
    : '';

  return { fullCode, includes, globals, setupCode, loopCode };
}

/** Brace-balanced extractor — same algorithm as EditorPage.tsx. */
function extractFunctionBody(code: string, functionName: string): string {
  const regex = new RegExp(`void ${functionName}\\(\\)\\s*\\{`);
  const match = code.match(regex);
  if (!match || match.index === undefined) return '';
  const startIndex = match.index + match[0].length;
  let braceCount = 1;
  let endIndex = startIndex;
  while (braceCount > 0 && endIndex < code.length) {
    const ch = code[endIndex];
    if (ch === '{') braceCount++;
    else if (ch === '}') braceCount--;
    endIndex++;
  }
  return code.substring(startIndex, endIndex - 1).trim();
}
