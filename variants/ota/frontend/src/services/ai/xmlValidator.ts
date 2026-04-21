export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedXml?: string;
}

function stripCodeFences(s: string): string {
  return s.replace(/^```(?:xml)?\s*\n?/, '').replace(/\n?```\s*$/, '');
}

export function validateBlocklyXml(raw: string, allowedTypes: Set<string>): ValidationResult {
  // Stage 1: trim + strip code fences (AI が ``` を返しても救済)
  const trimmed = stripCodeFences(raw.trim());

  // Stage 2: XML prefix check
  if (!trimmed.startsWith('<xml')) {
    return { valid: false, errors: ['Response does not start with <xml>'] };
  }

  // Stage 3: DOMParser syntax check
  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    return {
      valid: false,
      errors: [`XML parse error: ${parserError.textContent?.trim() ?? 'unknown error'}`],
    };
  }

  // Stage 4: All block[type] attributes must be in the catalog
  const blocks = [...doc.querySelectorAll('block[type]')];
  const types = blocks.map(b => b.getAttribute('type')!);
  const unknown = types.filter(t => !allowedTypes.has(t));
  if (unknown.length > 0) {
    return { valid: false, errors: [`Unknown block types: ${unknown.join(', ')}`] };
  }

  return { valid: true, errors: [], sanitizedXml: trimmed };
}
