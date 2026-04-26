import {
  buildSystemPrompt,
  fetchCatalog,
  filterCatalog,
  getAllowedTypes,
} from './systemPrompt';
import { trimConversationForContext } from './conversationContext';
import { validateBlocklyXml } from './xmlValidator';
import { dryRunBlocklyXml } from './blocklyDryRun';
import { AI_SYSTEM_PROMPTS } from '@/data/aiSystemPrompts';
import { AiGenerationError } from './errors';
import type {
  GenerateFromConversationInput,
  GenerateOutput,
  Message,
} from './index';

export type GenerateApiCall = (
  systemPrompt: string,
  historyMessages: Message[],
  finalUserContent: string,
) => Promise<{ content: string }>;

export async function generateWithRetry(
  input: GenerateFromConversationInput,
  apiCall: GenerateApiCall,
): Promise<GenerateOutput> {
  const catalog = await fetchCatalog();
  const filteredBlocks = filterCatalog(catalog);
  const allowedTypes = getAllowedTypes(filteredBlocks);

  // 動的 Few-shot 選択用に、ユーザー発言を結合
  const userPromptText = [
    ...input.messages.filter(m => m.role === 'user').map(m => m.content),
    input.generateRequest,
  ].join(' ');

  const systemPrompt = buildSystemPrompt({
    language: input.language,
    mode: input.robotMode,
    board: input.board,
    existingXml: input.existingXml,
    filteredBlocks,
    userPromptText,
  });

  const historyMessages = trimConversationForContext(input.messages);
  const { retryErrorPrefix } = AI_SYSTEM_PROMPTS[input.language].blockGen;
  let lastRaw = '';
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const finalUserContent = attempt > 1 && lastError
      ? `${retryErrorPrefix} ${lastError}\n\n${input.generateRequest}`
      : input.generateRequest;

    const { content } = await apiCall(systemPrompt, historyMessages, finalUserContent);
    lastRaw = content;

    const result = validateBlocklyXml(lastRaw, allowedTypes);
    if (!result.valid || !result.sanitizedXml) {
      lastError = result.errors[0] ?? 'XML 形式ではありませんでした';
      continue;
    }
    // 静的検証 OK → Blockly ランタイムで dry-run（接続構造の検証）
    const dryRun = dryRunBlocklyXml(result.sanitizedXml);
    if (!dryRun.valid) {
      lastError = `Blockly connection error: ${dryRun.error}. Value blocks (hasOutput=true) must not have <next>. Statement blocks (isStatement=true) must not be placed in <value> slots.`;
      continue;
    }
    return { xml: result.sanitizedXml, rawResponse: lastRaw, attempts: attempt };
  }

  throw new AiGenerationError('Failed to generate valid XML after 3 attempts', 3, lastRaw);
}
