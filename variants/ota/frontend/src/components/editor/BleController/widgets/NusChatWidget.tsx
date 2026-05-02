/**
 * NUS UART chat widget (47.md commit #3, Phase 1)
 *
 * Sends text via NUS RX, displays received messages from NUS TX in a
 * scrolling log. Subscribes to notifications on mount, unsubscribes on
 * unmount or disconnect.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { NusUartWidget } from '../types';
import type { WebBluetoothClient } from '../webBluetoothClient';
import { describeBleError } from '../errorMessages';

export interface NusChatWidgetProps {
  definition: NusUartWidget;
  client: WebBluetoothClient;
  isConnected: boolean;
}

interface ChatEntry {
  id: number;
  direction: 'sent' | 'received';
  text: string;
  timestamp: number;
}

const MAX_ENTRIES = 200;

export function NusChatWidget({ definition, client, isConnected }: NusChatWidgetProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const appendEntry = useCallback((direction: ChatEntry['direction'], text: string) => {
    setEntries((prev) => {
      const next = [...prev, { id: idRef.current++, direction, text, timestamp: Date.now() }];
      return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
    });
  }, []);

  // Subscribe to NUS receive once we're connected; clean up on disconnect / unmount
  useEffect(() => {
    if (!isConnected) return;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    client
      .subscribeNusReceive((text) => {
        if (!cancelled) appendEntry('received', text);
      })
      .then((unsub) => {
        if (cancelled) {
          unsub();
        } else {
          unsubscribe = unsub;
        }
      })
      .catch((err) => {
        const friendly = describeBleError(err, t);
        setError(friendly?.message ?? null);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isConnected, client, appendEntry, t]);

  // Auto-scroll to bottom on new entry
  useEffect(() => {
    const el = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (el instanceof HTMLElement) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  const handleSend = useCallback(async () => {
    if (!draft.trim() || !isConnected) return;
    const text = draft;
    setDraft('');
    try {
      await client.sendNusText(text);
      appendEntry('sent', text);
      setError(null);
    } catch (err) {
      const friendly = describeBleError(err, t);
      setError(friendly?.message ?? null);
    }
  }, [draft, isConnected, client, appendEntry, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  return (
    <Card className="flex flex-col h-full min-h-[280px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>📶</span>
          <span>{definition.label}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            NUS
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2 pt-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 border rounded-md bg-muted/30 px-2 py-1 min-h-[160px]">
          {entries.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              {isConnected
                ? t('bleController.chatEmpty', { defaultValue: 'メッセージはまだありません。送信して開始してください。' })
                : t('bleController.notConnected', { defaultValue: '未接続' })}
            </div>
          ) : (
            <div className="flex flex-col gap-1 py-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`text-xs font-mono px-2 py-1 rounded ${
                    entry.direction === 'sent'
                      ? 'bg-primary/10 text-foreground self-end max-w-[85%]'
                      : 'bg-card text-muted-foreground self-start max-w-[85%]'
                  }`}
                >
                  <span className="opacity-60 mr-1">{entry.direction === 'sent' ? '>' : '<'}</span>
                  <span className="whitespace-pre-wrap break-words">{entry.text}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {error && (
          <div className="text-xs text-destructive px-1">{error}</div>
        )}
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
            placeholder={t('bleController.messageInput', { defaultValue: 'メッセージを入力…' })}
            className="text-xs"
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!isConnected || !draft.trim()}
            size="sm"
          >
            {t('bleController.send', { defaultValue: '送信' })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
