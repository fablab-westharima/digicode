/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * BUG-085 Phase 2-V — Retry orchestrator that wraps AIClient.generateFromConversation
 * with semantic validation + fix-prompt retry loop (max 3 retries, D-2 採択).
 *
 * Flow:
 *   1. Initial generate (base prompt)
 *   2. semanticValidator.validateXml → issues[]
 *   3. If issues.length > 0 and retries < maxRetries:
 *        - buildFixPrompt with the issues + previous XML
 *        - call generateFromConversation with the fix request as
 *          generateRequest (system prompt + conversation history stay)
 *        - validate again
 *        - increment retry counter
 *   4. Return final XML + residualIssues (length === 0 = full closure;
 *      > 0 = warning path, but the XML still gets used; D-3 採択)
 *
 * Retry cost: each retry is an additional API call (~3-5s + per-token cost).
 * Cap at 3 retries balances closure rate vs cost — if the AI keeps
 * producing the same defect 3 times, additional retries are unlikely to
 * help and we hand control back to the user with a warning.
 */

import type {
  AIClient,
  GenerateFromConversationInput,
  GenerateOutput,
} from './index';
import type { BlockCatalog } from './systemPrompt';
import { validateXml, type ValidationIssue } from './semanticValidator';
import { buildFixPrompt } from './fixPromptBuilder';

export interface GenerateAndValidateResult {
  /** Final XML emitted by the AI (may still have residualIssues if retry exhausted). */
  xml: string;
  /** Raw response string from the last AI call. */
  rawResponse: string;
  /** Number of AI calls actually made (1 initial + N retries). */
  totalCalls: number;
  /** Number of semantic-validation-driven retries performed (0..maxRetries). */
  semanticRetries: number;
  /** Issues remaining after all retries exhausted (empty array = full success). */
  residualIssues: ValidationIssue[];
}

export interface GenerateAndValidateOptions {
  /** Max retries; default 3 (D-2 採択). */
  maxRetries?: number;
}

export async function generateAndValidate(
  client: AIClient,
  baseInput: GenerateFromConversationInput,
  catalog: BlockCatalog,
  options: GenerateAndValidateOptions = {},
): Promise<GenerateAndValidateResult> {
  const maxRetries = options.maxRetries ?? 3;

  // Initial generation.
  let result: GenerateOutput = await client.generateFromConversation(baseInput);
  let validation = validateXml(result.xml, catalog);
  const initialIssuesCount = validation.issues.length;
  const initialLoadError = validation.loadError;
  let semanticRetries = 0;
  let totalCalls = 1;

  // Retry loop.
  while (validation.issues.length > 0 && semanticRetries < maxRetries) {
    const fixRequest = buildFixPrompt(result.xml, validation.issues, baseInput.language);
    result = await client.generateFromConversation({
      ...baseInput,
      generateRequest: fixRequest,
    });
    totalCalls++;
    validation = validateXml(result.xml, catalog);
    semanticRetries++;
  }

  // BUG-085 P2-V — diagnostic surface for production smoke. Logged once
  // per generation (not per retry) to keep console quiet for normal flow
  // but visible enough for the user to confirm the validator+retry path
  // is firing on their browser.
  // eslint-disable-next-line no-console
  console.info('[BUG-085 P2-V] generateAndValidate result', {
    totalCalls,
    semanticRetries,
    initialIssuesCount,
    initialLoadError,
    residualIssuesCount: validation.issues.length,
    residualLoadError: validation.loadError,
  });

  return {
    xml: result.xml,
    rawResponse: result.rawResponse,
    totalCalls,
    semanticRetries,
    residualIssues: validation.issues,
  };
}
