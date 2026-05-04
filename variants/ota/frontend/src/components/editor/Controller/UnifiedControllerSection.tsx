/**
 * UnifiedControllerSection — folded-by-default section under the WiFi
 * controller dialog where the user assembles N projects + per-device IPs
 * into a single downloadable controller HTML (47.md Phase 3 / 48.md
 * commit #3, §8.3).
 *
 * Lifecycle of a row:
 *
 *   ┌── localStorage hydrate on mount (no blocklyXml; greyed-out) ──┐
 *   │                                                                │
 *   ▼                                                                │
 *   row.blocklyXml === null  ── user drops matching .digicode.json ──┘
 *                                                                    │
 *   row.blocklyXml === string  ◄────────────────────────────────────┘
 *                                                                    │
 *                  ─── user fills host (and optionally port) ────────┘
 *                                                                    │
 *                                                                    ▼
 *                              [Download] enabled
 *                                                                    │
 *   ─── buildUnifiedControllerHtml + URL.createObjectURL + a.click ──┘
 *                                                                    │
 *                              localStorage write (sans blocklyXml)
 *                              Dialog closes / user removes row → no save
 *
 * UI contract (48.md §8.3):
 *   - Drop zone + "Add file" button
 *   - Restoration notice (only when localStorage hydrated rows)
 *   - Per-row grid: project name | device label | device id | host | port | remove
 *   - LAN warning banner (always visible)
 *   - Inference warnings (when present)
 *   - Filename input (default `digicode-controller-YYYY-MM-DD.html`, F4)
 *   - Download button (disabled until rows.length>0 + every row has
 *     blocklyXml + every host non-empty)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
// `Sparkles` + `ChevronRight` は SHOW_PHASE4_AI_CHAT=true 復活時に
// AI section header で使用、コード残置 (Phase 3 統合 HTML フロー復活時に
// flip back、50.md commit #5)。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Upload, X, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  parseDigicodeFileContent,
  type DigicodeProjectFile,
} from '@/services/projectFileReader';
import {
  buildUnifiedControllerHtml,
  deriveDeviceId,
  uniquifyDeviceId,
  type UnifiedDeviceInput,
} from './unifiedControllerBuilder';
import { UNIFIED_BUNDLE_TEMPLATE } from '@/data/unifiedControllerBundle';
import { inferWifiUiSchemaFromXml } from './inferWifiUiSchema';
// Phase 4 AI UI customize は section から非表示 (50.md commit #5、user
// 指示 2026-05-04)。Phase 3 統合 HTML フロー復活時の revival:
// SHOW_PHASE4_AI_CHAT を true に flip + 該当 details section の `&& false`
// を外す。コード本体 (ControllerAiChat / controllerCustomizer / mergedSchema
// reduce / customizationDiffStack state / handleApplyDiff / handleUndoDiff)
// は残置 (Phase 4.1/4.2 復活時 + buildUnifiedControllerHtml の
// customizationDiffs API は BUG-076 fix 後も維持)。
import { applyCustomizationDiff, type CustomizationDiff } from './controllerCustomizer';
import type { WifiControllerSchema } from './types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ControllerAiChat } from './ControllerAiChat';

/** Phase 4 AI UI customize panel 表示制御 (50.md commit #5)。
 *  WifiControllerDialog の同名フラグと同期させること (両方 true で復活)。
 */
const SHOW_PHASE4_AI_CHAT = false;

// ---------------------------------------------------------------------------
// localStorage schema (48.md §8.4). max 20 entries; oldest dropped on overflow.
// blocklyXml is intentionally NOT persisted (size + responsibility lives with
// the user — they re-drop the file to re-attach).
// ---------------------------------------------------------------------------

const LOCAL_STORAGE_KEY = 'wifi-controller:unified-projects';
const LOCAL_STORAGE_MAX_ENTRIES = 20;
const DEFAULT_PORT = 81;

interface PersistedRow {
  deviceId: string;
  deviceLabel: string;
  host: string;
  port: number;
  projectTitle: string;
}

/** In-memory row — adds the (optional) blocklyXml that hydrate omits. */
interface ProjectRow extends PersistedRow {
  /** null = restored from localStorage but XML not yet re-attached. */
  blocklyXml: string | null;
}

function loadPersistedRows(): PersistedRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is PersistedRow =>
          !!e &&
          typeof e.deviceId === 'string' &&
          typeof e.deviceLabel === 'string' &&
          typeof e.host === 'string' &&
          typeof e.port === 'number' &&
          typeof e.projectTitle === 'string',
      )
      .slice(0, LOCAL_STORAGE_MAX_ENTRIES);
  } catch {
    return [];
  }
}

function persistRows(rows: ProjectRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedRow[] = rows
      .slice(0, LOCAL_STORAGE_MAX_ENTRIES)
      .map(({ deviceId, deviceLabel, host, port, projectTitle }) => ({
        deviceId,
        deviceLabel,
        host,
        port,
        projectTitle,
      }));
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded / private mode — silently lose the cache.
  }
}

function clearPersistedRows(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayFileName(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `digicode-controller-${yyyy}-${mm}-${dd}.html`;
}

/** Read a File as UTF-8 text via FileReader (Promise-style). */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e.target?.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsText(file);
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface UnifiedControllerSectionProps {
  /** Phase 4 Lite+ gating (50.md §10.2). Same gating as the parent dialog. */
  isAiUiCustomizeAvailable?: boolean;
  /** Click handler for the upgrade-plan CTA shown when isAiUiCustomizeAvailable=false. */
  onUpgradePlan?: () => void;
}

export function UnifiedControllerSection({
  isAiUiCustomizeAvailable = false,
  onUpgradePlan,
}: UnifiedControllerSectionProps = {}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [restoredCount, setRestoredCount] = useState(0);
  const [fileName, setFileName] = useState<string>(todayFileName());
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Phase 4 unified AI customization (50.md §10.2). UAT for the unified case
  // is deferred per D7 (requires multiple physical ESP32 devices); the panel
  // is wired up structurally so single-device UAT (P4.0) verifies the same
  // code path. Customization stack is unified-scoped (separate from the
  // Phase 2 single-device dialog's stack).
  const [customizationDiffStack, setCustomizationDiffStack] = useState<CustomizationDiff[]>([]);

  // Build a merged WifiControllerSchema from the rows for AI context. Each
  // row's blocklyXml is inferred via inferWifiUiSchemaFromXml; the schemas
  // are merged into a single multi-device schema with per-row deviceId/host.
  // Customization diffs are applied on top.
  const mergedSchema = useMemo<WifiControllerSchema>(() => {
    const devices = rows
      .filter((r) => r.blocklyXml)
      .map((r) => {
        const inferred = inferWifiUiSchemaFromXml(r.blocklyXml ?? '');
        const dev = inferred.devices[0];
        if (!dev) return null;
        return {
          ...dev,
          deviceId: r.deviceId,
          deviceLabel: r.deviceLabel,
          endpoint: { ...dev.endpoint, host: r.host || undefined, port: r.port },
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
    const base: WifiControllerSchema = {
      connection: 'wifi',
      version: '1.0',
      devices,
      warnings: [],
    };
    return customizationDiffStack.reduce(
      (acc, diff) => applyCustomizationDiff(acc, diff).schema,
      base,
    );
  }, [rows, customizationDiffStack]);

  const handleApplyDiff = (diff: CustomizationDiff): void => {
    setCustomizationDiffStack((prev) => [...prev, diff]);
  };
  const handleUndoDiff = (): void => {
    setCustomizationDiffStack((prev) => prev.slice(0, -1));
  };
  const hasReadyDevices = mergedSchema.devices.length > 0;

  // Hydrate from localStorage on mount. Restored rows are blocklyXml=null
  // until the user re-drops the matching .digicode.json.
  useEffect(() => {
    const persisted = loadPersistedRows();
    if (persisted.length === 0) return;
    setRows(
      persisted.map<ProjectRow>((p) => ({
        ...p,
        blocklyXml: null,
      })),
    );
    setRestoredCount(persisted.length);
  }, []);

  // ---------------------------------------------------------------------
  // File input / D&D handlers
  // ---------------------------------------------------------------------

  async function ingestFiles(files: FileList | File[]): Promise<void> {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setErrorMsg('');

    const failures: string[] = [];

    setRows((prev) => {
      // We need async file reads, so we resolve them outside this state
      // updater and apply with a follow-up setRows. Returning prev here
      // is a no-op; the actual update happens in the await chain below.
      return prev;
    });

    // Async read all files in parallel, then commit one state update.
    const parsed = await Promise.all(
      arr.map(async (file) => {
        try {
          const text = await readFileAsText(file);
          const result = parseDigicodeFileContent(text);
          if (!result.ok) {
            failures.push(file.name);
            return null;
          }
          return { file, data: result.data };
        } catch {
          failures.push(file.name);
          return null;
        }
      }),
    );

    if (failures.length > 0) {
      setErrorMsg(
        t('wifiController.unified.invalidFile', {
          defaultValue: 'このファイルは .digicode.json として読み込めません',
        }) +
          ' (' +
          failures.join(', ') +
          ')',
      );
    }

    setRows((prev) => {
      const next: ProjectRow[] = prev.slice();
      for (const entry of parsed) {
        if (!entry) continue;
        const { file, data } = entry;
        const projectTitle = data.title || file.name.replace(/\.digicode\.json$|\.json$/, '');
        const baseId = deriveDeviceId(projectTitle);

        // If a row for this projectTitle exists and is missing blocklyXml,
        // fill in-place (re-attach flow). Otherwise append a new row with
        // a uniquified deviceId.
        const reattachIdx = next.findIndex(
          (r) =>
            r.blocklyXml === null &&
            (r.projectTitle === projectTitle || r.deviceId === baseId),
        );
        if (reattachIdx !== -1) {
          next[reattachIdx] = {
            ...next[reattachIdx],
            blocklyXml: data.blocklyXml,
            // Re-attach also refreshes the canonical projectTitle so it
            // matches what the user saved most recently.
            projectTitle,
          };
          continue;
        }

        const used = new Set(next.map((r) => r.deviceId));
        const deviceId = uniquifyDeviceId(baseId, used);
        next.push(buildNewRow(deviceId, projectTitle, data));
      }
      persistRows(next);
      return next;
    });

    // Clear the file input value so the same file can be re-selected.
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    void ingestFiles(files);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    void ingestFiles(files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  // ---------------------------------------------------------------------
  // Per-row edits
  // ---------------------------------------------------------------------

  function updateRow(idx: number, patch: Partial<ProjectRow>): void {
    setRows((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      persistRows(next);
      return next;
    });
  }

  function removeRow(idx: number): void {
    setRows((prev) => {
      const next = prev.slice();
      next.splice(idx, 1);
      persistRows(next);
      return next;
    });
    setRestoredCount(0);
  }

  function clearAll(): void {
    setRows([]);
    setRestoredCount(0);
    clearPersistedRows();
  }

  // ---------------------------------------------------------------------
  // Download
  // ---------------------------------------------------------------------

  const reattachNeededCount = rows.filter((r) => r.blocklyXml === null).length;
  const allHostsFilled = rows.every((r) => r.host.trim().length > 0);
  const canDownload = rows.length > 0 && reattachNeededCount === 0 && allHostsFilled;

  const inferenceWarnings = useMemo<string[]>(() => {
    if (rows.length === 0) return [];
    const inputs = rowsToInputs(rows);
    if (inputs.length === 0) return [];
    try {
      return buildUnifiedControllerHtml(inputs, {
        bundleHtml: UNIFIED_BUNDLE_TEMPLATE,
        customizationDiffs: customizationDiffStack,
      }).schema.warnings;
    } catch {
      return [];
    }
  }, [rows, customizationDiffStack]);

  function handleDownload(): void {
    if (!canDownload) return;
    const inputs = rowsToInputs(rows);
    // Phase 4 (BUG-076): pass customizationDiffStack so AI-applied
    // colorScheme/layout/etc populate the embedded schema. Without this,
    // the downloaded HTML carries Layer 1 only (P4.0-4 UAT failure mode).
    const result = buildUnifiedControllerHtml(inputs, {
      bundleHtml: UNIFIED_BUNDLE_TEMPLATE,
      customizationDiffs: customizationDiffStack,
    });
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.trim() || todayFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    persistRows(rows);
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  return (
    <div className="p-4 space-y-3 border-t bg-muted/20">
      {/* Restoration notice (only when localStorage hydrated). Cleared
          permanently as soon as any row is removed or rows is cleared. */}
      {restoredCount > 0 && rows.length > 0 && (
        <div className="rounded border border-primary/30 bg-primary/10 p-2 text-xs flex items-center justify-between gap-2 flex-wrap">
          <span>
            {t('wifiController.unified.restoreFromLocalStorage', {
              defaultValue: '前回の編集を復元しました ({{count}} 機)',
              count: restoredCount,
            })}
          </span>
          <Button size="sm" variant="outline" onClick={clearAll}>
            {t('wifiController.unified.clearLocalStorage', { defaultValue: '履歴をクリア' })}
          </Button>
        </div>
      )}

      {/* Drop zone + Add-file button */}
      <div
        className={
          'rounded border-2 border-dashed p-4 text-center text-sm transition-colors ' +
          (dragActive ? 'border-primary bg-primary/10' : 'border-border bg-card')
        }
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <p className="text-muted-foreground mb-2">
          {t('wifiController.unified.dropZoneInstruction', {
            defaultValue:
              '.digicode.json ファイルをここにドラッグ&ドロップ、または「+ ファイル追加」で選択',
          })}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.digicode.json,application/json"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1" />
          {t('wifiController.unified.addFile', { defaultValue: '+ ファイル追加' })}
        </Button>
      </div>

      {/* Error toast (single line, replaces self on next ingestion). */}
      {errorMsg && (
        <div className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-foreground">
          ⚠ {errorMsg}
        </div>
      )}

      {/* Re-attach required notice */}
      {reattachNeededCount > 0 && (
        <div className="rounded border border-warning/40 bg-amber-500/10 p-2 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {t('wifiController.unified.reattachNeeded', {
              defaultValue: '{{count}} 機の .digicode.json を再ドロップしてください',
              count: reattachNeededCount,
            })}
          </span>
        </div>
      )}

      {/* Per-row grid */}
      {rows.length > 0 && (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_1fr_120px_140px_70px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>{t('wifiController.unified.colProjectTitle', { defaultValue: 'プロジェクト名' })}</span>
            <span>{t('wifiController.unified.colDeviceLabel', { defaultValue: 'デバイス表示名' })}</span>
            <span>{t('wifiController.unified.colDeviceId', { defaultValue: 'デバイス ID (自動)' })}</span>
            <span>{t('wifiController.unified.colHost', { defaultValue: 'IP アドレス' })}</span>
            <span>{t('wifiController.unified.colPort', { defaultValue: 'ポート' })}</span>
            <span className="sr-only">
              {t('wifiController.unified.colRemove', { defaultValue: '削除' })}
            </span>
          </div>
          {rows.map((row, idx) => (
            <div
              key={row.deviceId}
              className={
                'grid grid-cols-[1fr_1fr_120px_140px_70px_32px] gap-2 items-center ' +
                (row.blocklyXml === null ? 'opacity-60' : '')
              }
            >
              <span
                className="text-sm truncate text-foreground"
                title={row.projectTitle}
              >
                {row.projectTitle}
              </span>
              <Input
                size={1}
                value={row.deviceLabel}
                onChange={(e) => updateRow(idx, { deviceLabel: e.target.value })}
                className="h-8 text-sm"
              />
              <code className="font-mono text-xs text-muted-foreground truncate" title={row.deviceId}>
                {row.deviceId}
              </code>
              <Input
                size={1}
                value={row.host}
                onChange={(e) => updateRow(idx, { host: e.target.value })}
                placeholder="192.168.1.42"
                className="h-8 text-sm font-mono"
              />
              <Input
                type="number"
                value={row.port}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  updateRow(idx, { port: Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT });
                }}
                min={1}
                max={65535}
                className="h-8 text-sm font-mono"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeRow(idx)}
                aria-label={t('wifiController.unified.colRemove', { defaultValue: '削除' })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* LAN warning (always visible) */}
      <div className="rounded border border-warning/40 bg-amber-500/10 p-2 text-xs text-foreground">
        ⚠{' '}
        {t('wifiController.unified.lanWarning', {
          defaultValue:
            '全 ESP32 が同じ LAN に接続済み + 電源 ON が必要です。異 LAN / WAN 経由は動作しません',
        })}
      </div>

      {/* Inference warnings (when present) */}
      {inferenceWarnings.length > 0 && (
        <div className="rounded border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-200 space-y-1">
          <div className="font-medium">
            {t('wifiController.unified.warningsTitle', {
              defaultValue: '警告 ({{count}} 件)',
              count: inferenceWarnings.length,
            })}
          </div>
          {inferenceWarnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}

      {/* fileName + Download */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label htmlFor="unified-ctrl-filename" className="text-xs">
            {t('wifiController.unified.fileNameLabel', {
              defaultValue: 'ダウンロードファイル名',
            })}
          </Label>
          <Input
            id="unified-ctrl-filename"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="h-9 text-sm font-mono"
          />
        </div>
        <Button onClick={handleDownload} disabled={!canDownload} size="sm" className="h-9">
          {t('wifiController.unified.download', { defaultValue: 'HTML をダウンロード' })}
        </Button>
      </div>

      {!canDownload && rows.length > 0 && reattachNeededCount === 0 && !allHostsFilled && (
        <p className="text-xs text-destructive">
          {t('wifiController.unified.hostRequired', {
            defaultValue: '全 device の IP アドレス入力が必要です',
          })}
        </p>
      )}

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t('wifiController.unified.noDevices', {
            defaultValue: 'プロジェクトファイルを追加してください',
          })}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {t('wifiController.unified.openHowTo', {
          defaultValue:
            '保存した HTML をダブルクリック、またはブラウザにドラッグ&ドロップで開けます',
        })}
      </p>

      {/* Phase 4 / 50.md §10.2 — AI で UI をカスタマイズ for the unified case.
          50.md commit #5 (2026-05-04 user 指示) で本セクションは非表示化。
          Phase 3 統合 HTML フロー復活時の revival: SHOW_PHASE4_AI_CHAT を
          true に変更 + 下記 `&& false` 削除で復活可能。コード本体
          (ControllerAiChat / mergedSchema reduce / customizationDiffStack
          state) は残置済、buildUnifiedControllerHtml の customizationDiffs
          API は BUG-076 fix 後も維持されているため復活時 zero-rework。 */}
      {SHOW_PHASE4_AI_CHAT && hasReadyDevices && (
        <details className="border rounded-md mt-4 group">
          <summary className="cursor-pointer px-3 py-2 hover:bg-muted/50 flex items-center gap-2 text-sm">
            <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform shrink-0" />
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="font-medium">
              {t('controllerAiChat.titleUnified', {
                defaultValue: 'AI で統合 UI をカスタマイズ',
              })}
            </span>
            {!isAiUiCustomizeAvailable && (
              <span className="ml-1 text-[10px] text-orange-400">LITE+</span>
            )}
          </summary>
          <ControllerAiChat
            schema={mergedSchema}
            onApplyDiff={handleApplyDiff}
            onUndo={customizationDiffStack.length > 0 ? handleUndoDiff : undefined}
            isAvailable={isAiUiCustomizeAvailable}
            onUpgradePlan={onUpgradePlan}
          />
        </details>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

function buildNewRow(
  deviceId: string,
  projectTitle: string,
  data: DigicodeProjectFile,
): ProjectRow {
  return {
    deviceId,
    deviceLabel: projectTitle,
    host: '',
    port: DEFAULT_PORT,
    projectTitle,
    blocklyXml: data.blocklyXml,
  };
}

function rowsToInputs(rows: ProjectRow[]): UnifiedDeviceInput[] {
  return rows
    .filter((r): r is ProjectRow & { blocklyXml: string } => r.blocklyXml !== null)
    .map((r) => ({
      projectTitle: r.projectTitle,
      blocklyXml: r.blocklyXml,
      deviceLabel: r.deviceLabel,
      deviceId: r.deviceId,
      host: r.host,
      port: r.port,
    }));
}
