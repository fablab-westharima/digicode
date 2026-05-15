/**
 * OutdatedCompileServerDialog — surfaced when checkLocalVersion (Session 129)
 * detects a local image that is older than the latest DockerHub publish.
 *
 * Triggered by EditorPage when `result.outdated` arrives on the
 * compileService.compile() return value (local mode only — cloud is
 * auto-deployed via CF LB and never stale). The compile log still shows
 * the underlying error text in parallel with this dialog (intentional
 * redundancy per the Session 129 follow-up requirement: "ダイアログと
 * 併記、コンパイルログにもエラー行は残す").
 *
 * The dialog only closes — there is no "retry" button. Updating the image
 * is the user's responsibility, and the next compile click will re-run
 * checkLocalVersion automatically.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Box, Power, Trash2, Play, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface OutdatedSignal {
  localSha: string | undefined;
  remoteSha: string | undefined;
  reason: 'sha-mismatch' | 'legacy-image';
}

interface OutdatedCompileServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signal: OutdatedSignal | null;
}

export function OutdatedCompileServerDialog({
  open,
  onOpenChange,
  signal,
}: OutdatedCompileServerDialogProps) {
  const { t } = useTranslation();
  const unknownLabel = t('editor.compileLog.versionCheck.unknownLabel', {
    defaultValue: '不明',
  });
  const localLabel = signal?.localSha ?? unknownLabel;
  const remoteLabel = signal?.remoteSha ?? unknownLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {t('outdatedCompileServer.title', {
              defaultValue: 'コンパイルサーバーの更新が必要です',
            })}
          </DialogTitle>
          <DialogDescription>
            {t('outdatedCompileServer.description', {
              defaultValue:
                'ローカル compile-server の image が古いため、コンパイルを中止しました。最新の image に更新してから再度お試しください。',
            })}
          </DialogDescription>
        </DialogHeader>

        {/* SHA 差分表示 (Session 129 follow-up C-2 案A) */}
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between gap-3 font-mono">
            <span className="text-muted-foreground">
              {t('outdatedCompileServer.localShaLabel', { defaultValue: 'ローカル' })}
            </span>
            <span className="text-foreground">{localLabel}</span>
          </div>
          <div className="flex justify-between gap-3 font-mono mt-1">
            <span className="text-muted-foreground">
              {t('outdatedCompileServer.remoteShaLabel', { defaultValue: '最新' })}
            </span>
            <span className="text-foreground">{remoteLabel}</span>
          </div>
        </div>

        {/* 更新手順 3 steps */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            {t('outdatedCompileServer.stepsHeading', {
              defaultValue: 'Docker Desktop で以下の 3 ステップを実行してください',
            })}
          </p>

          <div className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
            <div className="rounded-md bg-muted p-2">
              <Box className="w-4 h-4 text-foreground" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">
                {t('outdatedCompileServer.step1Title', { defaultValue: '1. Pull' })}
              </p>
              <p className="text-muted-foreground mt-0.5">
                {t('outdatedCompileServer.step1Body', {
                  defaultValue:
                    'Images タブで digicollc/digicode-compile-server の ︙ → Pull を実行。',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
            <div className="rounded-md bg-muted p-2">
              <Trash2 className="w-4 h-4 text-foreground" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">
                {t('outdatedCompileServer.step2Title', {
                  defaultValue: '2. 古いコンテナを Stop → Delete',
                })}
              </p>
              <p className="text-muted-foreground mt-0.5">
                {t('outdatedCompileServer.step2Body', {
                  defaultValue:
                    'Containers タブで動いているコンテナを Stop し、続けて Delete も実行。Stop だけだと Images タブの緑● が消えず古い image を握ったままになるため、Delete も必須。',
                })}
              </p>
              <p className="text-muted-foreground mt-1 flex items-center gap-1">
                <Power className="w-3 h-3" />
                <span>
                  {t('outdatedCompileServer.step2Hint', {
                    defaultValue: 'Stop → Delete 両方クリックする必要があります。',
                  })}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
            <div className="rounded-md bg-muted p-2">
              <Play className="w-4 h-4 text-foreground" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">
                {t('outdatedCompileServer.step3Title', {
                  defaultValue: '3. 新 image で Run',
                })}
              </p>
              <p className="text-muted-foreground mt-0.5">
                {t('outdatedCompileServer.step3Body', {
                  defaultValue:
                    'Images タブで digicollc/digicode-compile-server:latest の Run ▶ をクリック。Optional settings で Host port を 3001、Container port も 3001 に設定して起動。',
                })}
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" />
          {t('outdatedCompileServer.retryNote', {
            defaultValue:
              '更新後、もう一度コンパイルボタンを押してください。バージョンチェックが自動で再実行されます。',
          })}
        </p>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('outdatedCompileServer.closeButton', { defaultValue: '閉じる' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
