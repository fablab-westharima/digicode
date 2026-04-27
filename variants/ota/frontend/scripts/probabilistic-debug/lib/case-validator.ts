/**
 * case-validator.ts
 *
 * Walks a generated BlockNode tree and verifies catalog conformance:
 *   - Every block.type exists in the catalog.
 *   - block.modes includes the case's mode.
 *   - block.boardRequires is satisfied by the case's board.
 *   - All required fields are present.
 *
 * Used both at generation time (catch bugs early) and as the assertion
 * surface for the integrity unit test. NOT a Blockly-syntactic validator;
 * it relies on catalog truth.
 */

import type { CatalogBlock, CatalogBoard, Mode } from './catalog-types';
import { isBlockAllowedOnBoard } from './catalog';
import type { BlockNode } from './xml-builder';

export interface ValidationContext {
  mode: Mode;
  board: CatalogBoard;
  blockIndex: Map<string, CatalogBlock>;
}

export interface ValidationIssue {
  /** Dotted path through the tree, e.g. 'root[0].statements.SETUP'. */
  path: string;
  blockType: string;
  reason: string;
}

function validateNode(
  node: BlockNode,
  ctx: ValidationContext,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const block = ctx.blockIndex.get(node.type);

  if (!block) {
    issues.push({
      path,
      blockType: node.type,
      reason: 'type not in catalog',
    });
    return issues;
  }

  if (!block.modes.includes(ctx.mode)) {
    issues.push({
      path,
      blockType: node.type,
      reason: `mode "${ctx.mode}" not in block.modes [${block.modes.join(',')}]`,
    });
  }

  if (!isBlockAllowedOnBoard(block, ctx.board)) {
    issues.push({
      path,
      blockType: node.type,
      reason: `boardRequires=${block.boardRequires} not satisfied by board "${ctx.board.id}"`,
    });
  }

  for (const f of block.fields) {
    if (!node.fields || !(f.name in node.fields)) {
      issues.push({
        path,
        blockType: node.type,
        reason: `missing required field "${f.name}"`,
      });
    }
  }

  if (node.values) {
    for (const [name, child] of Object.entries(node.values)) {
      issues.push(...validateNode(child, ctx, `${path}.values.${name}`));
    }
  }
  if (node.statements) {
    for (const [name, child] of Object.entries(node.statements)) {
      issues.push(
        ...validateNode(child, ctx, `${path}.statements.${name}`),
      );
    }
  }
  if (node.next) {
    issues.push(...validateNode(node.next, ctx, `${path}.next`));
  }

  return issues;
}

export function validateRoots(
  roots: BlockNode[],
  ctx: ValidationContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (let i = 0; i < roots.length; i++) {
    issues.push(...validateNode(roots[i], ctx, `root[${i}]`));
  }
  return issues;
}
