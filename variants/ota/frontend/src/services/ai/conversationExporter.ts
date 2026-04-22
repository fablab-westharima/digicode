import type { Message, AiMode, AiProvider } from './index';

export interface ExportOptions {
  mode: AiMode;
  provider: AiProvider;
  model?: string;
}

// 判断 4 のサンプルフォーマットに準拠
export function exportConversationToMarkdown(messages: Message[], options: ExportOptions): string {
  const now = new Date().toISOString();
  const modeLabel = options.mode === 'blockGen' ? 'ブロック生成' : 'ヘルプ';
  const providerLabel = options.model
    ? `${options.provider} (${options.model})`
    : options.provider;

  const lines: string[] = [
    '# AI アシスタント会話記録',
    '',
    `**日時**: ${now}`,
    `**モード**: ${modeLabel}`,
    `**プロバイダー**: ${providerLabel}`,
    '',
  ];

  let turnNumber = 0;

  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (msg.role === 'user') {
      turnNumber++;
      lines.push(`## [${turnNumber}] User (${time})`, msg.content, '');
    } else if (msg.role === 'assistant') {
      const tokenInfo = msg.tokensUsed != null
        ? ` - ${msg.tokensUsed.toLocaleString()} tokens`
        : '';
      lines.push(`## [${turnNumber}] Assistant (${time})${tokenInfo}`, msg.content, '');
    } else if (msg.role === 'system-meta') {
      lines.push(`## ブロック生成結果 (${time})`, msg.content, '');
      if (msg.generatedXml) {
        lines.push('```xml', msg.generatedXml, '```', '');
      }
    }
  }

  return lines.join('\n');
}
