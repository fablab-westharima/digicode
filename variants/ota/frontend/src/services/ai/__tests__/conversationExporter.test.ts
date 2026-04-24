import { describe, it, expect } from 'vitest';
import { exportConversationToMarkdown, type ExportLabels } from '../conversationExporter';
import type { Message } from '../index';

const baseTime = new Date('2026-04-22T06:30:00.000Z').getTime();

const enLabels: ExportLabels = {
  title: 'AI Assistant Conversation',
  date: 'Date',
  mode: 'Mode',
  provider: 'Provider',
  modeBlockGen: 'Block Generation',
  modeHelpBot: 'AI Chat',
  generatedResult: 'Block Generation Result',
};

function makeMsg(role: Message['role'], content: string, extra: Partial<Message> = {}): Message {
  return { id: 'test', role, content, timestamp: baseTime, ...extra };
}

describe('exportConversationToMarkdown', () => {
  it('includes header with mode and provider', () => {
    const result = exportConversationToMarkdown([], {
      mode: 'blockGen', provider: 'openai', model: 'gpt-4o',
      labels: enLabels, locale: 'en-US',
    });
    expect(result).toContain('# AI Assistant Conversation');
    expect(result).toContain('**Mode**: Block Generation');
    expect(result).toContain('**Provider**: openai (gpt-4o)');
  });

  it('formats user and assistant messages with matching turn numbers', () => {
    const messages: Message[] = [
      makeMsg('user', 'first question'),
      makeMsg('assistant', 'first reply', { tokensUsed: 100 }),
      makeMsg('user', 'next question'),
      makeMsg('assistant', 'next reply', { tokensUsed: 200 }),
    ];
    const result = exportConversationToMarkdown(messages, {
      mode: 'helpBot', provider: 'anthropic',
      labels: enLabels, locale: 'en-US',
    });
    expect(result).toContain('## [1] User');
    expect(result).toContain('first question');
    expect(result).toContain('## [1] Assistant');
    expect(result).toContain('100 tokens');
    expect(result).toContain('## [2] User');
    expect(result).toContain('## [2] Assistant');
    expect(result).toContain('200 tokens');
  });

  it('formats system-meta with generatedXml in xml code block', () => {
    const xml = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
    const messages: Message[] = [
      makeMsg('system-meta', 'Added 12 blocks', { generatedXml: xml }),
    ];
    const result = exportConversationToMarkdown(messages, {
      mode: 'blockGen', provider: 'gemini',
      labels: enLabels, locale: 'en-US',
    });
    expect(result).toContain('## Block Generation Result');
    expect(result).toContain('Added 12 blocks');
    expect(result).toContain('```xml');
    expect(result).toContain(xml);
    expect(result).toContain('```');
  });

  it('omits xml code block when system-meta has no generatedXml', () => {
    const messages: Message[] = [
      makeMsg('system-meta', 'meta only'),
    ];
    const result = exportConversationToMarkdown(messages, {
      mode: 'blockGen', provider: 'openai',
      labels: enLabels, locale: 'en-US',
    });
    expect(result).toContain('meta only');
    expect(result).not.toContain('```xml');
  });

  it('uses provider name without parentheses when model is not provided', () => {
    const result = exportConversationToMarkdown([], {
      mode: 'helpBot', provider: 'custom',
      labels: enLabels, locale: 'en-US',
    });
    expect(result).toContain('**Provider**: custom');
    expect(result).not.toContain('custom (');
  });

  it('uses translated labels (Japanese)', () => {
    const jaLabels: ExportLabels = {
      title: 'AI アシスタント会話記録',
      date: '日時',
      mode: 'モード',
      provider: 'プロバイダー',
      modeBlockGen: 'ブロック生成',
      modeHelpBot: 'AIチャット',
      generatedResult: 'ブロック生成結果',
    };
    const result = exportConversationToMarkdown([], {
      mode: 'blockGen', provider: 'openai',
      labels: jaLabels, locale: 'ja-JP',
    });
    expect(result).toContain('# AI アシスタント会話記録');
    expect(result).toContain('**モード**: ブロック生成');
    expect(result).toContain('**プロバイダー**: openai');
  });
});
