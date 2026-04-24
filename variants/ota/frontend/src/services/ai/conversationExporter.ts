import type { Message, AiMode, AiProvider } from './index';

export interface ExportLabels {
  title: string;
  date: string;
  mode: string;
  provider: string;
  modeBlockGen: string;
  modeHelpBot: string;
  generatedResult: string;
}

export interface ExportOptions {
  mode: AiMode;
  provider: AiProvider;
  model?: string;
  labels: ExportLabels;
  locale: string;
}

export function exportConversationToMarkdown(messages: Message[], options: ExportOptions): string {
  const now = new Date().toISOString();
  const modeLabel = options.mode === 'blockGen' ? options.labels.modeBlockGen : options.labels.modeHelpBot;
  const providerLabel = options.model
    ? `${options.provider} (${options.model})`
    : options.provider;

  const lines: string[] = [
    `# ${options.labels.title}`,
    '',
    `**${options.labels.date}**: ${now}`,
    `**${options.labels.mode}**: ${modeLabel}`,
    `**${options.labels.provider}**: ${providerLabel}`,
    '',
  ];

  let turnNumber = 0;

  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleTimeString(options.locale, {
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
      lines.push(`## ${options.labels.generatedResult} (${time})`, msg.content, '');
      if (msg.generatedXml) {
        lines.push('```xml', msg.generatedXml, '```', '');
      }
    }
  }

  return lines.join('\n');
}
