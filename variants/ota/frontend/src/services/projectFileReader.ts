/**
 * projectFileReader — shared `.digicode.json` parse + serialize helpers
 * (47.md Phase 3 / 48.md commit #2, §4.3).
 *
 * Single source of truth for the on-disk file format used by:
 *   - SaveProjectDialog.tsx       (writes)
 *   - ProjectListDialog.tsx       (reads)
 *   - UnifiedControllerSection.tsx (reads N at a time, Phase 3)
 *
 * Pure functions — no React, no DOM. The caller wires up the FileReader /
 * Blob plumbing. This split keeps the helpers testable and reusable in
 * vitest's node environment.
 *
 * The format itself was set by Phase B Part 2 (SaveProjectDialog initial
 * implementation) and has shipped unchanged since. Phase 3 keeps the same
 * shape — the new field (`host`) lives on the unified-controller schema,
 * not inside .digicode.json.
 */

/**
 * On-disk shape of a `.digicode.json` file. All fields are required when
 * SaveProjectDialog writes, but `description` may be absent in older /
 * hand-edited files (per `data.description` permissive read in
 * ProjectListDialog), and `generatedCode` / `language` were treated as
 * optional with defaults — preserved here for backward compatibility.
 */
export interface DigicodeProjectFile {
  title: string;
  description?: string;
  blocklyXml: string;
  generatedCode: string;
  /** Always `'arduino'` in current shipping code, kept open-typed for future. */
  language: string;
  /** ISO 8601 timestamp written at save time. */
  savedAt: string;
}

export type ParseDigicodeFileResult =
  | { ok: true; data: DigicodeProjectFile }
  | { ok: false; error: 'invalid-json' | 'missing-blockly-xml' | 'not-an-object' };

/**
 * Parse the textual content of a `.digicode.json` file.
 *
 * Returns a tagged result so the caller can localize the error message.
 * The legitimate-failure modes the existing ProjectListDialog handled were:
 *   - JSON syntax error           → 'invalid-json'
 *   - JSON parses to non-object   → 'not-an-object'
 *   - Object missing blocklyXml   → 'missing-blockly-xml' (the file is not
 *                                   a DigiCode project; previously surfaced
 *                                   via `t('project.invalidFile')`)
 */
export function parseDigicodeFileContent(text: string): ParseDigicodeFileResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid-json' };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'not-an-object' };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.blocklyXml !== 'string' || !obj.blocklyXml.trim()) {
    return { ok: false, error: 'missing-blockly-xml' };
  }
  return {
    ok: true,
    data: {
      title: typeof obj.title === 'string' ? obj.title : '',
      description: typeof obj.description === 'string' ? obj.description : undefined,
      blocklyXml: obj.blocklyXml,
      generatedCode: typeof obj.generatedCode === 'string' ? obj.generatedCode : '',
      language: typeof obj.language === 'string' ? obj.language : 'arduino',
      savedAt: typeof obj.savedAt === 'string' ? obj.savedAt : '',
    },
  };
}

/**
 * Serialize a project to the `.digicode.json` on-disk format. Pretty-printed
 * with 2-space indentation to match the SaveProjectDialog's pre-extraction
 * shape (`JSON.stringify(projectData, null, 2)`).
 */
export function serializeDigicodeProjectFile(data: DigicodeProjectFile): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Build the canonical filename used by SaveProjectDialog. Pulled out so the
 * Phase 3 unified-controller dialog can use the same convention if it ever
 * needs to suggest a filename for a re-export.
 */
export function defaultDigicodeFileName(title: string): string {
  return `${title.trim()}.digicode.json`;
}
