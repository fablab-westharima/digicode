/**
 * AI prompt copy-paste ダイアログ (BUG-081 follow-up 後の F-2 拡張、第101回)
 *
 * 用途: ローカルコンパイルサーバーで困った user が、ready-made prompt を
 * Gemini / ChatGPT 等の AI assistant にコピー&ペーストして自己解決できる
 * ようにする「🤖 AI に聞く」button (CompileServerSettings の disconnected
 * hint 内に配置) の click target。
 *
 * Tabs (Pull/Run | Verify) で 2 種の prompt を提示、defaultTab prop で
 * trigger context (initial disconnected = pullRun / manual test 失敗 = verify)
 * を反映。
 *
 * Prompt 文面: 同 session commit `5efe0aa` で各 lang の Markdown
 * (`docs/<lang>/local-compile-server.md`) に追加した文面を verbatim 流用
 * (DRY ではないが build chain 増を回避、改訂時は本 file + 5 markdown を sync
 * する義務、改訂時 grep キー = `aiPullRunPrompt` / `aiVerifyPrompt`)。
 *
 * 各 prompt に「最新の Docker Desktop の画面構成をまず調べてから回答」を
 * 含むため、AI が web search した上で現行 UI に即した手順を返す
 * (`memory:docs_maintenance_tradeoff` パターン)。
 */
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot } from 'lucide-react';
import { CommandBlock } from '@/components/common/CommandBlock';

export type AiPromptTab = 'pullRun' | 'verify';

interface AiPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Default tab on open. Caller passes 'pullRun' for initial-disconnected
   *  state and 'verify' after a manual connection-test failure. */
  defaultTab?: AiPromptTab;
}

// JA canonical prompt 文面 (5efe0aa Markdown verbatim、改訂時は ja.json + 5 lang Markdown も sync)
const JA_PULL_RUN_PROMPT = `Docker Desktop の最新 UI で、DockerHub からイメージを検索して Pull し、
コンテナを起動する手順を教えてください。
最新の Docker Desktop の画面構成をまず調べてから回答してください。
- イメージ名: digicollc/digicode-compile-server
- Container name: digicode-compile-server
- Host port: 3001
上記の設定で起動する手順を、初心者向けに 1 ステップずつ教えてください。`;

const JA_VERIFY_PROMPT = `Docker Desktop でコンテナが正常に起動しているか確認する方法を教えてください。
最新の Docker Desktop の画面構成をまず調べてから回答してください。
コンテナ名は digicode-compile-server、ポートは 3001 です。
http://localhost:3001/health にアクセスして確認する方法も含めて教えてください。`;

export function AiPromptDialog({
  open,
  onOpenChange,
  defaultTab = 'pullRun',
}: AiPromptDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t('localServerSetup.aiTitle', { defaultValue: 'AI アシスタントに聞く' })}
          </DialogTitle>
          <DialogDescription>
            {t('localServerSetup.aiDescription', {
              defaultValue:
                '下のプロンプトを Gemini / ChatGPT 等の AI アシスタントにコピー&ペーストしてください。各プロンプトは「最新の Docker Desktop の画面構成をまず調べてから回答」を含むため、AI が web 検索した上で現行 UI に即した手順を返します。',
            })}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pullRun">
              {t('localServerSetup.aiPullRunTab', { defaultValue: 'イメージ取得・起動' })}
            </TabsTrigger>
            <TabsTrigger value="verify">
              {t('localServerSetup.aiVerifyTab', { defaultValue: '起動確認・トラブル' })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pullRun" className="space-y-2 mt-3">
            <p className="text-xs text-muted-foreground">
              {t('localServerSetup.aiPullRunHint', {
                defaultValue:
                  'まだセットアップしていない場合 / コンテナが起動していない場合の手順を AI に聞くプロンプトです。',
              })}
            </p>
            <CommandBlock
              command={t('localServerSetup.aiPullRunPrompt', { defaultValue: JA_PULL_RUN_PROMPT })}
            />
          </TabsContent>

          <TabsContent value="verify" className="space-y-2 mt-3">
            <p className="text-xs text-muted-foreground">
              {t('localServerSetup.aiVerifyHint', {
                defaultValue:
                  'セットアップ済だが接続テストに失敗した場合の確認手順を AI に聞くプロンプトです。',
              })}
            </p>
            <CommandBlock
              command={t('localServerSetup.aiVerifyPrompt', { defaultValue: JA_VERIFY_PROMPT })}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
