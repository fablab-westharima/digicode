/**
 * ローカルコンパイルサーバー セットアップ / アンインストール ダイアログ
 *
 * 案 2 採択 (16.md / 46.md): in-dialog modal で OS 別コマンドを直接表示
 * + copy button + 詳細ガイドリンク。docs page 経由の摩擦 (link → page →
 * command 探す) を 1 クリックに短縮し、テスター視点での discoverability を
 * 担保する。
 *
 * Public mirror: fablab-westharima/digicode-installer (script 配布元)
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Apple, Monitor, Terminal, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';

export type LocalSetupMode = 'install' | 'uninstall';

interface LocalServerSetupDialogProps {
  open: boolean;
  mode: LocalSetupMode;
  onOpenChange: (open: boolean) => void;
}

const INSTALLER_BASE =
  'https://raw.githubusercontent.com/fablab-westharima/digicode-installer/main';

// Best-effort guess at the user's OS — used only to pre-select the
// appropriate tab. Falls back to macOS when navigator.platform is empty.
function guessDefaultOs(): 'mac' | 'linux' | 'windows' {
  if (typeof navigator === 'undefined') return 'mac';
  const ua = `${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('linux') && !ua.includes('android')) return 'linux';
  return 'mac';
}

interface CommandBlockProps {
  command: string;
  /** Optional second-line command rendered below `command` (same copy target). */
}

function CommandBlock({ command }: CommandBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative bg-muted border border-border rounded-md">
      <pre className="p-3 pr-20 overflow-x-auto text-xs text-foreground font-mono whitespace-pre-wrap break-all leading-relaxed">
        {command}
      </pre>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 mr-1" />
            {t('localServerSetup.copied', { defaultValue: 'コピー済' })}
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 mr-1" />
            {t('localServerSetup.copy', { defaultValue: 'コピー' })}
          </>
        )}
      </Button>
    </div>
  );
}

export function LocalServerSetupDialog({
  open,
  mode,
  onOpenChange,
}: LocalServerSetupDialogProps) {
  const { t } = useTranslation();
  const [os, setOs] = useState<'mac' | 'linux' | 'windows'>(guessDefaultOs());

  // The installer treats "install" as the default subcommand and accepts
  // "uninstall" as an explicit subcommand. PowerShell and bash both follow
  // the pattern documented in scripts/local-compile/README.md.
  const macLinuxCmd =
    mode === 'install'
      ? `bash <(curl -fsSL ${INSTALLER_BASE}/install.sh)`
      : `bash <(curl -fsSL ${INSTALLER_BASE}/install.sh) uninstall`;

  const windowsCmd =
    mode === 'install'
      ? `irm ${INSTALLER_BASE}/install.ps1 | iex`
      : `& ([scriptblock]::Create((irm ${INSTALLER_BASE}/install.ps1))) uninstall`;

  const titleKey =
    mode === 'install' ? 'localServerSetup.installTitle' : 'localServerSetup.uninstallTitle';
  const titleDefault =
    mode === 'install'
      ? 'ローカルコンパイルサーバーをセットアップ'
      : 'ローカルコンパイルサーバーをアンインストール';

  const descKey =
    mode === 'install'
      ? 'localServerSetup.installDescription'
      : 'localServerSetup.uninstallDescription';
  const descDefault =
    mode === 'install'
      ? 'Docker でローカルにコンパイルサーバーを起動します。下のコマンドをターミナル / PowerShell で実行してください。'
      : 'コンテナと永続ボリューム (コンパイルキャッシュ含む) を削除します。下のコマンドをターミナル / PowerShell で実行してください。';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            {t(titleKey, { defaultValue: titleDefault })}
          </DialogTitle>
          <DialogDescription>
            {t(descKey, { defaultValue: descDefault })}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={os} onValueChange={(v) => setOs(v as typeof os)} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mac" className="gap-1.5">
              <Apple className="h-3.5 w-3.5" />
              macOS
            </TabsTrigger>
            <TabsTrigger value="linux" className="gap-1.5">
              <Terminal className="h-3.5 w-3.5" />
              Linux
            </TabsTrigger>
            <TabsTrigger value="windows" className="gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              Windows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mac" className="space-y-2 mt-3">
            <p className="text-xs text-muted-foreground">
              {t('localServerSetup.macHint', {
                defaultValue: 'ターミナル.app で実行してください。',
              })}
            </p>
            <CommandBlock command={macLinuxCmd} />
          </TabsContent>

          <TabsContent value="linux" className="space-y-2 mt-3">
            <p className="text-xs text-muted-foreground">
              {t('localServerSetup.linuxHint', {
                defaultValue:
                  '任意のターミナル (bash/zsh) で実行してください。',
              })}
            </p>
            <CommandBlock command={macLinuxCmd} />
          </TabsContent>

          <TabsContent value="windows" className="space-y-2 mt-3">
            <p className="text-xs text-muted-foreground">
              {t('localServerSetup.windowsHint', {
                defaultValue:
                  '「Windows PowerShell」 (64-bit 標準版、x86 / ISE ではない方) を起動して実行してください。Windows 11 で PowerShell 7 を入れている場合は 「PowerShell」 でも OK。管理者権限は不要です。',
              })}
            </p>
            <CommandBlock command={windowsCmd} />
          </TabsContent>
        </Tabs>

        {/* mode-specific extra info */}
        {mode === 'install' && (
          <div className="text-xs text-muted-foreground space-y-1 mt-1">
            <p>
              {t('localServerSetup.installNoteDocker', {
                defaultValue:
                  'Docker が必要です (未インストールの場合はスクリプトが OS 別 DL URL を案内します)。',
              })}
            </p>
            <p>
              {t('localServerSetup.installNotePort', {
                defaultValue:
                  '初回起動時に使用ポートを聞かれます。3001 が空いていればそのまま Enter で OK、3001 が使用中なら別ポート (例: 3002) が提示されます。',
              })}
            </p>
          </div>
        )}

        {mode === 'uninstall' && (
          <div className="flex items-start gap-2 mt-1 p-3 bg-destructive/10 border border-destructive/30 rounded text-xs text-foreground">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-destructive" />
            <span>
              {t('localServerSetup.uninstallWarning', {
                defaultValue:
                  'コンテナと永続ボリュームを削除すると、コンパイルキャッシュも消えます。次回コンパイルは ~30-60 秒の cold start になります (Docker イメージは保持を選択可能)。',
              })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <Link
            to="/docs?doc=local-compile-server"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {t('localServerSetup.fullGuide', { defaultValue: '詳細ガイドを別タブで開く' })}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('localServerSetup.close', { defaultValue: '閉じる' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
