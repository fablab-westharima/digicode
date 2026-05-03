/**
 * WifiControllerDialog (47.md Phase 2 commit #4, §5.9.2)
 *
 * Surfaced from `LinearToolbar` (the "WiFi" button next to BLE). Phase 2
 * deliberately has NO bottom-panel mediator — per 47.md §0.4 + the U5 user
 * report ("the bottom panel was never used in practice"), the WiFi flow
 * goes straight from the toolbar button into this Dialog.
 *
 * What this Dialog provides (per §5.9.2):
 *   - IP input (text field) + saved-IP history dropdown (localStorage).
 *   - QR code of `http://<ip>/` so a phone can scan and open the
 *     ESP32-served controller bundle (commits #1 / #2 / #3) directly.
 *   - URL row with "open in browser" + "copy" actions.
 *   - Static widget preview (display-only) inferred from
 *     `websocket_server_register` blocks in the workspace.
 *   - Footer warning explaining the prerequisites (ESP32 powered + WiFi).
 *
 * What this Dialog does NOT do (intentional, see commit #4 design notes):
 *   - No connection test (HTTPS DigiCode → HTTP ESP32 is blocked by
 *     browser mixed-content policy — same root cause that drove the
 *     case B+C architecture, §0.3 / §5.10). "Open in browser" navigates
 *     to the ESP32 directly, sidestepping the constraint.
 *   - No mDNS auto-detect (47.md §5.9.3 stretch goal, deferred).
 *   - No live WS client (Phase 2 doesn't need one — controllers run on
 *     the phone/PC that scanned the QR; DigiCode just provisions the URL).
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { inferWifiUiSchemaFromXml } from './inferWifiUiSchema';
import type { WifiWidgetDefinition } from './types';

const HISTORY_KEY = 'wifi-controller:lastIps';
const HISTORY_MAX = 5;
const DEFAULT_IP_PLACEHOLDER = '192.168.1.42';

export interface WifiControllerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live workspace XML — re-inferred on every change to keep the preview accurate. */
  workspaceXml: string;
}

export function WifiControllerDialog({
  open,
  onOpenChange,
  workspaceXml,
}: WifiControllerDialogProps) {
  const { t } = useTranslation();

  const schema = useMemo(() => inferWifiUiSchemaFromXml(workspaceXml), [workspaceXml]);
  const device = schema.devices[0];
  const widgets = device?.widgets ?? [];
  const port = device?.endpoint.port ?? 81;

  const [ip, setIp] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Hydrate IP / history from localStorage on first open. Doing this in
  // useEffect (not lazy useState init) avoids touching localStorage during
  // SSR / vitest renders that may not have a window.
  useEffect(() => {
    const loaded = loadIpHistory();
    setHistory(loaded);
    if (loaded.length > 0 && !ip) setIp(loaded[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedIp = ip.trim();
  const url = trimmedIp ? `http://${trimmedIp}/` : '';
  const hasUrl = trimmedIp.length > 0;

  function commitIpToHistory(): void {
    if (!trimmedIp) return;
    const next = saveIpToHistory(trimmedIp);
    setHistory(next);
  }

  async function handleCopyUrl(): Promise<void> {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail on insecure contexts / older browsers.
      // Silent — the user can long-press / right-click the URL text.
    }
  }

  function handleOpenInBrowser(): void {
    if (!url) return;
    commitIpToHistory();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[92vw] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b shrink-0">
          <DialogTitle className="text-base font-medium flex items-center gap-2">
            <span>📡</span>
            <span>{t('wifiController.dialogTitle', { defaultValue: 'WiFi コントローラ' })}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* IP input + history */}
          <div className="space-y-2">
            <Label htmlFor="wifi-ctrl-ip" className="text-sm">
              {t('wifiController.ipAddress', { defaultValue: 'ESP32 IP アドレス' })}
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id="wifi-ctrl-ip"
                type="text"
                inputMode="numeric"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                onBlur={commitIpToHistory}
                placeholder={DEFAULT_IP_PLACEHOLDER}
                className="font-mono"
              />
              {history.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <History className="w-4 h-4 mr-1" />
                      {t('wifiController.lastIpHistory', { defaultValue: '履歴' })}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {history.map((h) => (
                      <DropdownMenuItem
                        key={h}
                        onClick={() => setIp(h)}
                        className="font-mono text-sm"
                      >
                        {h}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* QR + URL block */}
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-start">
            <div className="bg-white p-3 rounded border self-start mx-auto sm:mx-0">
              {hasUrl ? (
                <QRCodeSVG value={url} size={176} level="M" />
              ) : (
                <div className="w-[176px] h-[176px] flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                  {t('wifiController.noUrlYet', { defaultValue: 'IP を入力すると QR コードが表示されます' })}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <code className="block bg-muted text-foreground px-3 py-2 rounded text-sm font-mono break-all min-h-[2.5rem]">
                {hasUrl ? url : ' '}
              </code>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={handleOpenInBrowser} disabled={!hasUrl}>
                  <ExternalLink className="w-4 h-4 mr-1" />
                  {t('wifiController.openInBrowser', { defaultValue: 'ブラウザで開く' })}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUrl}
                  disabled={!hasUrl}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {copied
                    ? t('wifiController.urlCopied', { defaultValue: 'コピーしました' })
                    : t('wifiController.copyUrl', { defaultValue: 'URL をコピー' })}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('wifiController.qrInstructions', {
                  defaultValue:
                    'スマホで QR コードをスキャン、または URL をコピーしてブラウザで開いてください。',
                })}
              </p>
              {port !== 81 && (
                <p className="text-xs text-muted-foreground">
                  {t('wifiController.wsPortNote', {
                    defaultValue: 'WebSocket ポート = {{port}}',
                    port,
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Static widget preview */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-medium">
                {t('wifiController.previewLabel', {
                  defaultValue: 'ウィジェット プレビュー (説明用、操作不可)',
                })}
              </h3>
              <span className="text-xs text-muted-foreground">
                {t('wifiController.previewNote', {
                  defaultValue: '実際の操作は ESP32 配信ページで行います。',
                })}
              </span>
            </div>
            {widgets.length === 0 ? (
              <div className="rounded border bg-muted/40 p-4 text-sm text-muted-foreground text-center">
                {t('wifiController.noServerBlocks', {
                  defaultValue:
                    'WebSocket サーバーブロックを workspace に追加してください。',
                })}
              </div>
            ) : (
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {widgets.map((w) => (
                  <PreviewWidget key={w.id} widget={w} />
                ))}
              </div>
            )}
            {schema.warnings.length > 0 && (
              <div className="rounded border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                {schema.warnings.map((w, i) => (
                  <div key={i}>⚠ {w}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-3 text-xs text-muted-foreground shrink-0">
          ⚠️{' '}
          {t('wifiController.requireWifi', {
            defaultValue: 'ESP32 がこの IP に接続済みかつ電源 ON が必要です。',
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Display-only widget previews (operation: §5.9.2 "操作不可").
//
// These mirror the visual shape of the bundle's widgets (commit #1) so the
// user can see what their controller will look like *without* having to
// navigate to the ESP32. Inputs are intentionally `disabled` / `readOnly`.
// ---------------------------------------------------------------------------

function PreviewWidget({ widget }: { widget: WifiWidgetDefinition }) {
  switch (widget.type) {
    case 'gatt-toggle':
      return (
        <PreviewCard label={widget.label} channelId={widget.channelId}>
          <button
            type="button"
            disabled
            className="w-full px-3 py-1.5 rounded border bg-background text-sm font-medium opacity-70 cursor-not-allowed"
          >
            OFF
          </button>
        </PreviewCard>
      );
    case 'gatt-slider':
      return (
        <PreviewCard label={widget.label} channelId={widget.channelId}>
          <div className="text-xl font-semibold tabular-nums">{widget.min}</div>
          <input
            type="range"
            min={widget.min}
            max={widget.max}
            value={widget.min}
            disabled
            readOnly
            className="w-full opacity-70 cursor-not-allowed"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{widget.min}</span>
            <span>{widget.max}</span>
          </div>
        </PreviewCard>
      );
    case 'gatt-display':
      return (
        <PreviewCard label={widget.label} channelId={widget.channelId}>
          <div className="text-xl font-semibold tabular-nums opacity-70">--</div>
          <div className="text-[10px] text-muted-foreground">
            {widget.dataType}
            {widget.notifyEnabled ? ' · notify' : ''}
          </div>
        </PreviewCard>
      );
  }
}

function PreviewCard({
  label,
  channelId,
  children,
}: {
  label: string;
  channelId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border bg-card p-2 space-y-1">
      <div className="text-xs text-muted-foreground truncate" title={channelId}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// localStorage helpers (HISTORY_KEY = 'wifi-controller:lastIps', max 5)
// ---------------------------------------------------------------------------

function loadIpHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveIpToHistory(ip: string): string[] {
  const cur = loadIpHistory();
  const next = [ip, ...cur.filter((x) => x !== ip)].slice(0, HISTORY_MAX);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Quota exceeded / private mode — ignore, user just loses history.
    }
  }
  return next;
}
