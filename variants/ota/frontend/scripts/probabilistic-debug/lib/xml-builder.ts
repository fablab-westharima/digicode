/**
 * xml-builder.ts
 *
 * Emits Blockly workspace XML matching the format used by sampleProjects.ts
 * and parsed by BlocklyEditor.tsx.
 *
 * Reference shape:
 *   <xml xmlns="https://developers.google.com/blockly/xml">
 *     <block type="arduino_setup" x="50" y="50">
 *       <statement name="SETUP">
 *         <block type="esp32_pin_mode">
 *           <field name="PIN">2</field>
 *           <field name="MODE">OUTPUT</field>
 *         </block>
 *       </statement>
 *     </block>
 *   </xml>
 */

const BLOCKLY_XMLNS = 'https://developers.google.com/blockly/xml';

export interface BlockNode {
  type: string;
  /** Field key/value pairs (rendered as `<field name="...">value</field>`). */
  fields?: Record<string, string | number | boolean>;
  /** Value sockets — each socket holds a single child block. */
  values?: Record<string, BlockNode>;
  /** Statement sockets — each holds a single child (chain via `next`). */
  statements?: Record<string, BlockNode>;
  /** Next block in the same chain. */
  next?: BlockNode;
  /** Top-level workspace coordinates (only honoured on root blocks). */
  x?: number;
  y?: number;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function emitField(name: string, value: string | number | boolean): string {
  return `<field name="${escapeXml(name)}">${escapeXml(String(value))}</field>`;
}

function emitBlock(node: BlockNode, isRoot = false): string {
  const attrs: string[] = [`type="${escapeXml(node.type)}"`];
  if (isRoot && node.x !== undefined) attrs.push(`x="${node.x}"`);
  if (isRoot && node.y !== undefined) attrs.push(`y="${node.y}"`);

  const children: string[] = [];

  if (node.fields) {
    for (const [name, value] of Object.entries(node.fields)) {
      children.push(emitField(name, value));
    }
  }

  if (node.values) {
    for (const [name, child] of Object.entries(node.values)) {
      children.push(
        `<value name="${escapeXml(name)}">${emitBlock(child)}</value>`,
      );
    }
  }

  if (node.statements) {
    for (const [name, child] of Object.entries(node.statements)) {
      children.push(
        `<statement name="${escapeXml(name)}">${emitBlock(child)}</statement>`,
      );
    }
  }

  if (node.next) {
    children.push(`<next>${emitBlock(node.next)}</next>`);
  }

  return `<block ${attrs.join(' ')}>${children.join('')}</block>`;
}

/** Serialize one or more root blocks into Blockly workspace XML. */
export function emitXml(roots: BlockNode[]): string {
  const body = roots.map((r) => emitBlock(r, true)).join('');
  return `<xml xmlns="${BLOCKLY_XMLNS}">${body}</xml>`;
}
