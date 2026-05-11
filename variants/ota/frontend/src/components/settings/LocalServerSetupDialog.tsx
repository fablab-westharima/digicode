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
import { Apple, Monitor, Terminal, ExternalLink, AlertTriangle, Box, Code } from 'lucide-react';
import { CommandBlock } from '@/components/common/CommandBlock';

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

export function LocalServerSetupDialog({
  open,
  mode,
  onOpenChange,
}: LocalServerSetupDialogProps) {
  const { t } = useTranslation();
  const [os, setOs] = useState<'mac' | 'linux' | 'windows'>(guessDefaultOs());
  // 案内の主経路は Docker Desktop GUI (DockerHub publish 後の推奨)。CLI は上級者向けに残す。
  const [installMethod, setInstallMethod] = useState<'gui' | 'cli'>('gui');
  const dockerImage = 'digicollc/digicode-compile-server';

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

        <Tabs value={installMethod} onValueChange={(v) => setInstallMethod(v as typeof installMethod)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gui" className="gap-1.5">
              <Box className="h-3.5 w-3.5" />
              {t('localServerSetup.methodGui', { defaultValue: 'Docker Desktop (推奨)' })}
            </TabsTrigger>
            <TabsTrigger value="cli" className="gap-1.5">
              <Code className="h-3.5 w-3.5" />
              {t('localServerSetup.methodCli', { defaultValue: 'コマンド (上級者向け)' })}
            </TabsTrigger>
          </TabsList>

          {/* === GUI 経路: Docker Desktop GUI で pull + run === */}
          <TabsContent value="gui" className="space-y-3 mt-3">
            {mode === 'install' ? (
              <>
                <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                  <li>{t('localServerSetup.guiStep1', { defaultValue: 'Docker Desktop を起動 (未インストールの場合は下の OS 別リンクから DL)' })}</li>
                  <li>
                    {t('localServerSetup.guiStep2', { defaultValue: '上部の検索バーに次のイメージ名を入力 → Pull' })}
                    <CommandBlock command={dockerImage} />
                  </li>
                  <li>
                    {t('localServerSetup.guiStep3', { defaultValue: 'Images タブで該当イメージの「Run」をクリック → Optional settings を展開' })}
                  </li>
                  <li>
                    {t('localServerSetup.guiStep4', { defaultValue: 'Container name 任意 (例: digicode-compile-server)、Host port: 3001、Container port も 3001 を入力 → Run' })}
                  </li>
                  <li>
                    {t('localServerSetup.guiStep5', { defaultValue: '次の URL をブラウザで開いて動作確認 (OK が表示されれば成功)' })}
                    <CommandBlock command="http://localhost:3001/health" />
                  </li>
                </ol>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    {t('localServerSetup.guiNotePort', {
                      defaultValue: 'ポート 3001 が他で使用中の場合は別の番号を指定。DigiCode の「コンパイル設定」 → ローカルサーバーで同じ番号を入力してください。',
                    })}
                  </p>
                </div>
              </>
            ) : (
              <>
                <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                  <li>{t('localServerSetup.guiUninstall1', { defaultValue: 'Docker Desktop の「Containers」タブを開く' })}</li>
                  <li>{t('localServerSetup.guiUninstall2', { defaultValue: 'digicode-compile-server コンテナを Stop → Delete' })}</li>
                  <li>{t('localServerSetup.guiUninstall3', { defaultValue: '「Volumes」タブで digicode-projects / digicode-cache を Delete (キャッシュも消えます)' })}</li>
                  <li>{t('localServerSetup.guiUninstall4', { defaultValue: '「Images」タブで digicollc/digicode-compile-server を Delete (任意、再 install 時間短縮のために残してもよい)' })}</li>
                </ol>
              </>
            )}
          </TabsContent>

          {/* === CLI 経路: 上級者向け、Linux サーバ / 自動化向け === */}
          <TabsContent value="cli" className="space-y-3 mt-3">
            <Tabs value={os} onValueChange={(v) => setOs(v as typeof os)}>
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
