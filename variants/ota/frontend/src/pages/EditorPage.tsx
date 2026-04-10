import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BlocklyEditor } from '@/components/editor/BlocklyEditor';
import type { BlocklyEditorRef } from '@/components/editor/BlocklyEditor';
import { CodePreview } from '@/components/editor/CodePreview';
import { LinearToolbar } from '@/components/editor/LinearToolbar';
import { StatusBar, type StatusBarState } from '@/components/editor/StatusBar';
import { Sidebar } from '@/components/editor/Sidebar';
import { RobotModeSelector } from '@/components/editor/RobotModeSelector';
import { SaveProjectDialog } from '@/components/editor/SaveProjectDialog';
import { ProjectListDialog } from '@/components/editor/ProjectListDialog';
import { SampleProjectsDialog } from '@/components/editor/SampleProjectsDialog';
import { SerialMonitor } from '@/components/serial/SerialMonitor';
import { SerialPlotter } from '@/components/serial/SerialPlotter';
import { PIDTuningPanel } from '@/components/tuning/PIDTuningPanel';
import type { SampleProject } from '@/data/sampleProjects';
import { BoardSelector } from '@/components/editor/BoardSelector';
import { LocaleSelector } from '@/components/common/LocaleSelector';
import { DeviceSelectDialog } from '@/components/device/DeviceSelectDialog';
import type { DigiCodeDevice } from '@/components/device/DeviceSelectDialog';
import { BatchUpdateDialog } from '@/components/device/BatchUpdateDialog';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { TutorialSelectDialog } from '@/components/tutorial/TutorialSelectDialog';
import { WifiSetupDialog } from '@/components/wifi/WifiSetupDialog';
import { WifiPrerequisitesDialog } from '@/components/wifi/WifiPrerequisitesDialog';
import { DeviceNameDialog } from '@/components/device/DeviceNameDialog';
import { FirmwareInstallerDialog } from '@/components/firmware/FirmwareInstallerDialog';
import { PinSettingsDialog } from '@/components/pins/PinSettingsDialog';
import { ServoTrimDialog } from '@/components/servo/ServoTrimDialog';
import { CompileServerSettingsDialog } from '@/components/settings/CompileServerSettingsDialog';
import { WifiDeviceSelectDialog, type Device } from '@/components/device/WifiDeviceSelectDialog';
import { PasskeyManagementDialog } from '@/components/auth/PasskeyManagementDialog';
import { TwoFactorSettingsDialog } from '@/components/auth/TwoFactorSettingsDialog';
import { useAuthStore } from '@/stores/authStore';
import { AccountDeleteDialog } from '@/components/auth/AccountDeleteDialog';
import { useProjectStore } from '@/stores/projectStore';
import { useSerialStore } from '@/stores/serialStore';
import { useWifiStore } from '@/stores/wifiStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { useBoardStore, type FlashMethod } from '@/stores/boardStore';
import { getTutorialById } from '@/data/tutorials';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Project } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { compileService, type CompileServerMode, type FullPackage, type ConnectionType } from '@/services/compileService';
import { usbFirmwareService, type UsbFlashProgress, type UsbChipInfo } from '@/services/usbFirmwareService';
import { bleFirmwareService, type BleFlashProgress, type BleDeviceInfo } from '@/services/bleFirmwareService';
import { checkADC2Usage, type ADC2Warning } from '@/utils/adc2Check';
import { api } from '@/lib/api';
import { firmwareService, type FlashProgress } from '@/services/firmwareService';
import { Download, Loader2, Zap, SlidersHorizontal, LineChart, Code, Terminal, ChevronUp, ChevronDown, GraduationCap, ChevronDown as ChevronDownIcon, X, FilePlus, FolderOpen, FileCode, Cloud, Server, Usb, Wifi, Bluetooth, Check, Settings2, Pin, BookOpen, Globe, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

export function EditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout, isAuthenticated } = useAuthStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const { status: serialStatus, connect: connectSerial, disconnect: disconnectSerial, forceReleaseAllPorts } = useSerialStore();
  const { status: wifiStatus, getDeviceUrl, setHost, setDeviceName, connect: connectWifi } = useWifiStore();
  const { getSelectedBoard } = useBoardStore();

  const [generatedCode, setGeneratedCode] = useState('');
  const [workspaceXml, setWorkspaceXml] = useState('<xml></xml>');
  const [isDirty, setIsDirty] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [showSerialMonitor, setShowSerialMonitor] = useState(false);
  const [showSerialPlotter, setShowSerialPlotter] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileLog, setCompileLog] = useState<string[]>([]);
  const [compileDialogOpen, setCompileDialogOpen] = useState(false);
  const [flashDialogOpen, setFlashDialogOpen] = useState(false);
  const [flashProgress, setFlashProgress] = useState<FlashProgress>({
    stage: 'connecting',
    percent: 0,
    message: ''
  });
  const [batchSelectDialogOpen, setBatchSelectDialogOpen] = useState(false);
  const [batchUpdateDialogOpen, setBatchUpdateDialogOpen] = useState(false);
  const [batchUpdateDevices, setBatchUpdateDevices] = useState<DigiCodeDevice[]>([]);
  const [pendingOtaBinary, setPendingOtaBinary] = useState<Blob | null>(null);
  const [tutorialDialogOpen, setTutorialDialogOpen] = useState(false);
  const [wifiSetupDialogOpen, setWifiSetupDialogOpen] = useState(false);
  const [wifiPrerequisitesDialogOpen, setWifiPrerequisitesDialogOpen] = useState(false);
  const [deviceNameDialogOpen, setDeviceNameDialogOpen] = useState(false);
  const [wifiDeviceSelectDialogOpen, setWifiDeviceSelectDialogOpen] = useState(false);
  const [wifiDeviceSelectMultiMode, setWifiDeviceSelectMultiMode] = useState(false);
  const [firmwareInstallerDialogOpen, setFirmwareInstallerDialogOpen] = useState(false);
  const [firmwareDialogDefaultType, setFirmwareDialogDefaultType] = useState<'ota' | 'ble'>('ota');
  const [pinSettingsDialogOpen, setPinSettingsDialogOpen] = useState(false);
  const [servoTrimDialogOpen, setServoTrimDialogOpen] = useState(false);
  const [compileServerSettingsDialogOpen, setCompileServerSettingsDialogOpen] = useState(false);
  const [flashMethodDialogOpen, setFlashMethodDialogOpen] = useState(false);
  const [compiledBinary, setCompiledBinary] = useState<Blob | null>(null);
  const [codePreviewDialogOpen, setCodePreviewDialogOpen] = useState(false);
  const [pidTuningDialogOpen, setPidTuningDialogOpen] = useState(false);
  const [passkeyRegisterDialogOpen, setPasskeyRegisterDialogOpen] = useState(false);
  const [twoFactorSettingsDialogOpen, setTwoFactorSettingsDialogOpen] = useState(false);
  const [accountDeleteDialogOpen, setAccountDeleteDialogOpen] = useState(false);
  const [adc2WarningDialogOpen, setAdc2WarningDialogOpen] = useState(false);
  const [adc2Warnings, setAdc2Warnings] = useState<ADC2Warning[]>([]);
  const [pendingCompileAction, setPendingCompileAction] = useState<(() => void) | null>(null);
  const [bottomPanelExpanded, setBottomPanelExpanded] = useState(false);
  const [serverMode, setServerMode] = useState<CompileServerMode>('cloud');
  const [compileUsage, setCompileUsage] = useState<{
    count: number;
    limit: number;
    remaining: number;
    isOverLimit: boolean;
  } | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<string>('code');
  const [statusBarState, setStatusBarState] = useState<StatusBarState>('ready');
  const [statusBarMessage, setStatusBarMessage] = useState<string>('');
  const blocklyEditorRef = useRef<BlocklyEditorRef>(null);
  const compiledBinaryRef = useRef<Blob | null>(null);
  const { isMobile, isMobileOrTablet } = useBreakpoint();
  const { currentTutorial, isActive: isTutorialActive } = useTutorialStore();
  // ブラウザを閉じる/リロード時の確認
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // URLパラメータでプロジェクト一覧を開く
  useEffect(() => {
    const openParam = searchParams.get('open');
    if (openParam === 'true') {
      setOpenDialogOpen(true);
    }
  }, [searchParams]);

  // コンパイルサーバー設定と使用量を読み込み
  useEffect(() => {
    setServerMode(compileService.getMode());

    // 使用量を取得（ログイン済みの場合のみ）
    const fetchUsage = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      try {
        const response = await api.compileUsage.get();
        if (response.ok) {
          const data = await response.json();
          setCompileUsage(data);
        }
      } catch (error) {
        console.error('Failed to fetch compile usage:', error);
      }
    };

    fetchUsage();
  }, []);

  // サーバーモード変更ハンドラー
  const handleServerModeChange = (mode: CompileServerMode) => {
    setServerMode(mode);
    compileService.setMode(mode);
  };

  // コンパイル成功後に使用量を再取得（ログイン済みの場合のみ）
  const refreshUsage = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || serverMode !== 'cloud') return;

    try {
      const response = await api.compileUsage.get();
      if (response.ok) {
        const data = await response.json();
        setCompileUsage(data);
      }
    } catch (error) {
      console.error('Failed to refresh compile usage:', error);
    }
  };

  // Phase A以降: プロジェクトはJSONファイルで読み書きするため、
  // URL ?id= からのクラウドプロジェクト読み込みは廃止
  // （projectStore / projects API はクラス機能（Phase C）で再利用予定のため残す）

  // 現在のプロジェクトが変更された時にワークスペースを更新
  useEffect(() => {
    if (currentProject) {
      setWorkspaceXml(currentProject.blocklyXml);
      setGeneratedCode(currentProject.generatedCode || '');
      // BlocklyEditorに反映
      if (blocklyEditorRef.current) {
        blocklyEditorRef.current.loadXml(currentProject.blocklyXml);
      }
    }
  }, [currentProject]);

  // チュートリアル開始時にサンプルXMLを読み込む
  useEffect(() => {
    if (isTutorialActive && currentTutorial) {
      const tutorial = getTutorialById(currentTutorial);
      if (tutorial?.sampleXml && blocklyEditorRef.current) {
        // サンプルXMLをワークスペースに読み込み
        blocklyEditorRef.current.loadXml(tutorial.sampleXml);
        setWorkspaceXml(tutorial.sampleXml);
      }
    }
  }, [currentTutorial, isTutorialActive]);


  // ワークスペース変更時
  const handleWorkspaceChange = useCallback((xml: string, code: string) => {
    setWorkspaceXml(xml);
    setGeneratedCode(code);
    setIsDirty(true);
  }, []);

  // 保存
  const handleSave = () => {
    setSaveDialogOpen(true);
  };

  // 開く
  const handleOpen = () => {
    setOpenDialogOpen(true);
  };

  // ファームウェア初期書き込みダイアログを開く
  const handleBleFirmwareWrite = () => {
    setFirmwareDialogDefaultType('ble');
    setFirmwareInstallerDialogOpen(true);
  };

  const handleWifiFirmwareWrite = () => {
    setFirmwareDialogDefaultType('ota');
    setFirmwareInstallerDialogOpen(true);
  };

  // USBポート解放
  const handleUsbPortRelease = async () => {
    try {
      const releasedCount = await forceReleaseAllPorts();
      if (releasedCount > 0) {
        alert(`${releasedCount}個のUSBポートを解放しました。\n\n接続がうまくいかない場合は、USBケーブルを抜き差ししてから再度接続してください。`);
      } else {
        alert('解放する必要のあるUSBポートはありませんでした。\n\n接続がうまくいかない場合は、USBケーブルを抜き差ししてから再度接続してください。');
      }
    } catch (error) {
      console.error('USBポート解放エラー:', error);
      alert('USBポートの解放中にエラーが発生しました。\n\nブラウザでWeb Serial APIが有効になっているか確認してください。');
    }
  };

  // ログアウト（エディタに残る）
  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      logout();
    }
  };

  // パスキー登録ダイアログを開く
  const handlePasskeyRegister = () => {
    setPasskeyRegisterDialogOpen(true);
  };

  // アカウント削除ダイアログを開く
  const handleAccountDelete = () => {
    setAccountDeleteDialogOpen(true);
  };

  // 2FA設定ダイアログを開く
  const handleTwoFactorSettings = () => {
    setTwoFactorSettingsDialogOpen(true);
  };

  // プロジェクト選択（JSONファイルから読み込み）
  const handleProjectSelect = (project: Project) => {
    setWorkspaceXml(project.blocklyXml);
    setGeneratedCode(project.generatedCode || '');
    setIsDirty(false);
    // BlocklyEditorに反映
    if (blocklyEditorRef.current) {
      blocklyEditorRef.current.loadXml(project.blocklyXml);
    }
  };

  // 新規作成
  const handleNew = () => {
    if (isDirty && !confirm(t('editor.unsavedChanges'))) {
      return;
    }
    setCurrentProject(null);
    setWorkspaceXml('<xml></xml>');
    setGeneratedCode('');
    setIsDirty(false);
    // BlocklyEditorをリセット
    if (blocklyEditorRef.current) {
      blocklyEditorRef.current.loadXml('<xml></xml>');
    }
    // URLからIDを削除
    navigate('/editor', { replace: true });
  };

  // キーボードショートカット
  useKeyboardShortcuts({
    onSave: () => setSaveDialogOpen(true),
    onOpen: () => setOpenDialogOpen(true),
    onNew: handleNew,
    onCompile: () => {
      if (generatedCode.trim()) {
        setCompileDialogOpen(true);
      }
    },
    onToggleMonitor: () => setShowSerialMonitor(prev => !prev),
    onEscape: () => {
      if (saveDialogOpen) setSaveDialogOpen(false);
      else if (openDialogOpen) setOpenDialogOpen(false);
      else if (sampleDialogOpen) setSampleDialogOpen(false);
      else if (tutorialDialogOpen) setTutorialDialogOpen(false);
      else if (compileDialogOpen && !isCompiling) setCompileDialogOpen(false);
    },
  });

  // サンプルプロジェクト選択
  const handleSampleSelect = (sample: SampleProject) => {
    // XMLを読み込み
    setWorkspaceXml(sample.blocklyXml);
    setIsDirty(false);
    if (blocklyEditorRef.current) {
      blocklyEditorRef.current.loadXml(sample.blocklyXml);
    }
    // 現在のプロジェクトをクリア
    setCurrentProject(null);
    navigate('/editor', { replace: true });
  };

  // 保存完了時
  const handleSaved = () => {
    setIsDirty(false);
  };

  // デバイス接続確認（コンパイル前チェック用）- リトライ付き
  const checkDeviceConnection = async (
    deviceUrl: string,
    onLog?: (message: string) => void
  ): Promise<{ ok: boolean; resolvedUrl?: string; error?: string }> => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2秒
    const log = (msg: string) => {
      console.log(msg);
      onLog?.(msg);
    };

    try {
      // .localドメインの場合、mDNS解決を先に行う
      let resolvedUrl = deviceUrl;
      if (deviceUrl.includes('.local')) {
        const hostname = new URL(deviceUrl).hostname;
        log(`[接続確認] mDNS解決中: ${hostname}`);
        const resolvedIp = await firmwareService.resolveMdns(hostname);
        if (resolvedIp) {
          resolvedUrl = `http://${resolvedIp}`;
          log(`[接続確認] IP解決: ${resolvedIp}`);
        } else {
          return { ok: false, error: `デバイス「${hostname}」が見つかりません。電源とWiFi接続を確認してください。` };
        }
      }

      // デバイスにping（リトライ付き）
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        log(`[接続確認] 接続テスト中... (${attempt + 1}/${maxRetries})`);
        const online = await firmwareService.checkDeviceOnline(resolvedUrl, 30000);
        if (online) {
          return { ok: true, resolvedUrl };
        }

        // 最後のリトライでなければ待機
        if (attempt < maxRetries - 1) {
          log(`[接続確認] 応答なし、${retryDelay / 1000}秒後にリトライ...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      return { ok: false, error: 'デバイスが応答しません。電源とWiFi接続を確認してください。' };
    } catch (error) {
      return { ok: false, error: `接続確認エラー: ${error instanceof Error ? error.message : '不明なエラー'}` };
    }
  };

  // ADC2チェック付きコンパイル実行
  const proceedWithCompile = async () => {
    setAdc2WarningDialogOpen(false);
    if (pendingCompileAction) {
      pendingCompileAction();
      setPendingCompileAction(null);
    }
  };

  // コンパイル＆書き込み - WiFiの場合は先に接続確認
  const handleCompile = async () => {
    if (!generatedCode.trim()) {
      alert(t('editor.noCodeToCompile'));
      return;
    }

    // ADC2チェック（OTAモードのみ）
    const warnings = checkADC2Usage(generatedCode);
    if (warnings.length > 0) {
      setAdc2Warnings(warnings);
      setPendingCompileAction(() => () => proceedToFlashMethodSelection());
      setAdc2WarningDialogOpen(true);
      return;
    }

    proceedToFlashMethodSelection();
  };

  // 書き込み方法選択へ進む
  const proceedToFlashMethodSelection = async () => {
    // 毎回書込み方法選択ダイアログを表示
    // （以前は前回WiFiで接続済みの場合にデバイス選択をスキップしていたが、
    //   毎回異なるデバイスに書き込む可能性があるため、常にデバイス選択を表示する）
    setFlashMethodDialogOpen(true);
  };

  // 実際のコンパイル処理（書込み方法選択後に呼ばれる）
  // OTA/USB書込み用のコンパイル（firmware.binのBlobを返す）
  const executeCompile = async (format: 'bin' | 'uf2' = 'bin'): Promise<Blob | null> => {
    setIsCompiling(true);
    setCompileLog([]);
    setCompileDialogOpen(true);
    setStatusBarState('compiling');
    setStatusBarMessage(t('status.compilingCode'));

    const addLog = (message: string) => {
      setCompileLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    try {
      addLog('コード解析開始...');

      // コードを解析してincludes, globals, setup, loopに分割
      // #includeを抽出
      const includeLines = generatedCode.match(/^#include\s+.+$/gm) || [];
      const includes = includeLines.join('\n');
      addLog(`#include: ${includeLines.length}件検出`);

      // 括弧のバランスを考慮した抽出関数
      const extractFunctionBody = (code: string, functionName: string): string => {
        const regex = new RegExp(`void ${functionName}\\(\\)\\s*\\{`);
        const match = code.match(regex);
        if (!match) return '';

        const startIndex = match.index! + match[0].length;
        let braceCount = 1;
        let endIndex = startIndex;

        for (let i = startIndex; i < code.length && braceCount > 0; i++) {
          if (code[i] === '{') braceCount++;
          else if (code[i] === '}') braceCount--;
          endIndex = i;
        }

        return code.substring(startIndex, endIndex).trim();
      };

      const setupCode = extractFunctionBody(generatedCode, 'setup');
      const loopCode = extractFunctionBody(generatedCode, 'loop');

      // グローバル変数を抽出（includeとsetup()の間）
      const setupMatch = generatedCode.match(/void setup\(\)/);
      const globals = setupMatch
        ? generatedCode.substring(0, setupMatch.index).replace(/^#include\s+.+$\n?/gm, '').trim()
        : '';

      addLog(`グローバル変数: ${globals ? '検出' : 'なし'}`);
      addLog(`setup(): ${setupCode ? '検出' : 'なし'}`);
      addLog(`loop(): ${loopCode ? '検出' : 'なし'}`);

      console.log('Compiling with includes:', includes);
      console.log('Compiling with globals:', globals);
      console.log('Compiling with setup:', setupCode);
      console.log('Compiling with loop:', loopCode);

      addLog('サーバーにコンパイルリクエスト送信中...');

      // コンパイル実行
      const result = await compileService.compile(includes, globals, setupCode, loopCode, undefined, format);

      if (result.success) {
        // コンパイル成功 - fullPackageまたはbinaryを取得
        // OTA/USB書込み用にはfirmware.binのBlobを使用
        const firmwareBinary = result.fullPackage?.firmware || result.binary || null;

        if (!firmwareBinary) {
          addLog('✗ コンパイルエラー: バイナリデータが取得できませんでした');
          setIsCompiling(false);
          setStatusBarState('error');
          setStatusBarMessage('バイナリデータが取得できませんでした');
          return null;
        }

        // サイズ表示
        const firmwareSize = firmwareBinary.size;

        addLog('✓ コンパイル成功！');
        addLog(`バイナリサイズ: ${(firmwareSize / 1024).toFixed(1)} KB`);
        if (result.fullPackage) {
          addLog('📦 fullPackageモード: 4ファイル（bootloader, partitions, boot_app0, firmware）取得');
        }

        // fullPackageの場合もfirmware.binだけを保存（OTA用）
        compiledBinaryRef.current = firmwareBinary;

        // 使用量を再取得
        refreshUsage();

        setIsCompiling(false);
        setCompileDialogOpen(false);
        setStatusBarState('success');
        setStatusBarMessage(t('status.compileSuccess'));

        // OTA/USB書込み用にはfirmware.binのBlobを返す
        // fullPackageモードでもfirmwareだけを返す（OTA updateはfirmware.binのみ必要）
        return firmwareBinary;
      } else {
        addLog(`✗ コンパイルエラー: ${result.error}`);
        if (result.details) {
          addLog(`詳細: ${result.details}`);
        }
        setIsCompiling(false);
        setStatusBarState('error');
        setStatusBarMessage(result.error || t('status.compileFailed'));
        return null;
      }
    } catch (error) {
      addLog(`✗ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      setIsCompiling(false);
      setStatusBarState('error');
      setStatusBarMessage(error instanceof Error ? error.message : t('status.unknownError'));
      return null;
    }
  };

  // 複数デバイス選択後の処理（一括更新）- 旧DeviceSelectDialog用
  const handleBatchDeviceSelect = (devices: DigiCodeDevice[]) => {
    setBatchUpdateDevices(devices);
    setBatchSelectDialogOpen(false);
    setBatchUpdateDialogOpen(true);
  };

  // 複数デバイス選択後の処理（一括更新）- 新WifiDeviceSelectDialog用
  const handleWifiMultiDeviceSelected = (devices: Device[]) => {
    // Device[] を DigiCodeDevice[] に変換
    const digiCodeDevices: DigiCodeDevice[] = devices.map(d => ({
      url: d.ipAddress ? `http://${d.ipAddress}` : '',
      name: d.name,
      uuid: d.uuid,
      ipAddress: d.ipAddress || '',
      firmwareVersion: '',
      lastSeen: Date.now(),
      isOnline: true,
    }));

    setBatchUpdateDevices(digiCodeDevices);
    setWifiDeviceSelectDialogOpen(false);
    setBatchUpdateDialogOpen(true);
  };

  // 一括更新完了後の処理
  const handleBatchUpdateComplete = (results: Map<string, boolean>) => {
    const successCount = Array.from(results.values()).filter(v => v).length;
    const failCount = results.size - successCount;
    console.log(`Batch OTA完了: 成功 ${successCount}台, 失敗 ${failCount}台`);
    // バイナリをクリア
    setPendingOtaBinary(null);
    setBatchUpdateDevices([]);
  };

  // OTA更新処理
  const handleOtaUpdate = async (binary: Blob, deviceUrl: string) => {
    // 進捗ダイアログを開く
    setFlashDialogOpen(true);
    setFlashProgress({
      stage: 'connecting',
      percent: 0,
      message: `${deviceUrl} に接続中...`
    });

    try {
      const success = await firmwareService.otaUpdate(deviceUrl, binary, (progress) => {
        setFlashProgress(progress);
      });

      if (success) {
        // 成功後、少し待ってからダイアログを閉じる
        setTimeout(() => {
          setFlashDialogOpen(false);
          alert('✓ OTA更新が完了しました！\nESP32が再起動します。');
        }, 2000);
      } else {
        setFlashDialogOpen(false);
      }
    } catch (error) {
      setFlashDialogOpen(false);
      alert(`✗ OTA更新エラー:\n${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  /**
   * WiFiデバイス選択後の処理
   * WifiDeviceSelectDialogからデバイスが選択されたときに呼ばれる
   */
  const handleWifiDeviceSelected = async (device: { uuid: string; name: string; ipAddress?: string }) => {
    setWifiDeviceSelectDialogOpen(false);

    if (!device.ipAddress) {
      alert('デバイスにIPアドレスが設定されていません。\n「接続」→「無線LAN接続」から再設定してください。');
      return;
    }

    const deviceUrl = `http://${device.ipAddress}`;

    // wifiStoreの状態を更新
    setHost(device.ipAddress);
    setDeviceName(device.name);
    await connectWifi();

    // コンパイル前にデバイス接続確認
    setCompileLog([
      `[接続確認] デバイス: ${device.name} (${device.ipAddress})`
    ]);
    setCompileDialogOpen(true);
    setIsCompiling(true);

    const checkResult = await checkDeviceConnection(
      deviceUrl,
      (msg) => setCompileLog(prev => [...prev, msg])
    );
    if (!checkResult.ok) {
      setCompileLog(prev => [...prev, `[接続確認] ✗ ${checkResult.error}`]);
      setIsCompiling(false);
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`デバイス接続エラー: ${checkResult.error}\n\nコンパイルチケットを節約するため、コンパイルは実行されませんでした。`);
      setCompileDialogOpen(false);
      return;
    }

    setCompileLog(prev => [...prev, '[接続確認] ✓ デバイス接続OK']);
    setCompileDialogOpen(false);
    setIsCompiling(false);

    // 接続確認OK→コンパイル実行→書込み
    const binary = await executeCompile();
    if (binary) {
      await handleOtaUpdate(binary, deviceUrl);
    }
  };

  /**
   * USB用コンパイル（connectionType='usb'でDigiCodeUSB.inoテンプレート使用）
   * 教訓（ルール10）に基づき、OTA用とは別関数として定義
   * @returns FullPackage（4ファイルセット）またはnull
   */
  const executeCompileForUsb = async (): Promise<FullPackage | null> => {
    setIsCompiling(true);
    setCompileLog([]);
    setCompileDialogOpen(true);
    setStatusBarState('compiling');
    setStatusBarMessage('USB用ファームウェアをコンパイル中...');

    const addLog = (message: string) => {
      setCompileLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    try {
      addLog('USB用コンパイル開始（DigiCodeUSB.inoテンプレート）...');

      // コードを解析してincludes, globals, setup, loopに分割
      const includeLines = generatedCode.match(/^#include\s+.+$/gm) || [];
      const includes = includeLines.join('\n');
      addLog(`#include: ${includeLines.length}件検出`);

      const extractFunctionBody = (code: string, functionName: string): string => {
        const regex = new RegExp(`void ${functionName}\\(\\)\\s*\\{`);
        const match = code.match(regex);
        if (!match) return '';

        const startIndex = match.index! + match[0].length;
        let braceCount = 1;
        let endIndex = startIndex;

        for (let i = startIndex; i < code.length && braceCount > 0; i++) {
          if (code[i] === '{') braceCount++;
          else if (code[i] === '}') braceCount--;
          endIndex = i;
        }

        return code.substring(startIndex, endIndex).trim();
      };

      const setupCode = extractFunctionBody(generatedCode, 'setup');
      const loopCode = extractFunctionBody(generatedCode, 'loop');

      const setupMatch = generatedCode.match(/void setup\(\)/);
      const globals = setupMatch
        ? generatedCode.substring(0, setupMatch.index).replace(/^#include\s+.+$\n?/gm, '').trim()
        : '';

      addLog(`グローバル変数: ${globals ? '検出' : 'なし'}`);
      addLog(`setup(): ${setupCode ? '検出' : 'なし'}`);
      addLog(`loop(): ${loopCode ? '検出' : 'なし'}`);

      addLog('サーバーにコンパイルリクエスト送信中（connectionType=usb）...');

      // USB用コンパイル実行（connectionType='usb'を指定）
      const result = await compileService.compile(includes, globals, setupCode, loopCode, undefined, 'bin', 'usb');

      if (result.success && result.fullPackage) {
        addLog('✓ USB用コンパイル成功！');
        addLog(`ファームウェアサイズ: ${(result.fullPackage.firmware.size / 1024).toFixed(1)} KB`);
        addLog('📦 fullPackageモード: 4ファイル取得完了');

        refreshUsage();
        setIsCompiling(false);
        setCompileDialogOpen(false);
        setStatusBarState('success');
        setStatusBarMessage('USB用コンパイル成功');

        return result.fullPackage;
      } else {
        addLog(`✗ コンパイルエラー: ${result.error || 'fullPackageが取得できませんでした'}`);
        if (result.details) {
          addLog(`詳細: ${result.details}`);
        }
        setIsCompiling(false);
        setStatusBarState('error');
        setStatusBarMessage(result.error || 'コンパイル失敗');
        return null;
      }
    } catch (error) {
      addLog(`✗ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      setIsCompiling(false);
      setStatusBarState('error');
      setStatusBarMessage(error instanceof Error ? error.message : '不明なエラー');
      return null;
    }
  };

  /**
   * USB書き込み処理
   * 教訓（2025-12-10）に基づく実装:
   * - usbFirmwareServiceを使用（firmwareServiceとは独立）
   * - fullPackageモード: 4ファイル書き込み
   * - NVS保護: eraseFlash()なし
   * - baudrate: 115200 bps固定
   *
   * 重要: Web Serial APIのrequestPort()はユーザージェスチャーコンテキスト内でのみ呼び出し可能
   * そのため、順序は「1.ポート選択 → 2.コンパイル → 3.書き込み」とする
   */
  const handleUsbWrite = async () => {
    // 1. 先にUSBポート選択（ユーザージェスチャーコンテキスト内で実行必須）
    setFlashDialogOpen(true);
    setFlashProgress({
      stage: 'connecting',
      percent: 0,
      message: 'USBデバイスを選択してください...'
    });

    let chipInfo: UsbChipInfo | null = null;
    try {
      chipInfo = await usbFirmwareService.connect((progress: UsbFlashProgress) => {
        setFlashProgress({
          stage: progress.stage as FlashProgress['stage'],
          percent: progress.percent,
          message: progress.message,
          file: progress.file
        });
      });

      if (!chipInfo) {
        setFlashDialogOpen(false);
        return;
      }

      setFlashProgress({
        stage: 'connecting',
        percent: 30,
        message: `接続成功: ${chipInfo.name} (MAC: ${chipInfo.mac})`
      });
    } catch (error) {
      setFlashDialogOpen(false);
      alert(`✗ USB接続エラー:\n${error instanceof Error ? error.message : '不明なエラー'}`);
      return;
    }

    // 2. USB用コンパイル（接続確認後）
    setFlashProgress({
      stage: 'preparing',
      percent: 35,
      message: 'USB用ファームウェアをコンパイル中...'
    });

    const fullPackage = await executeCompileForUsb();
    if (!fullPackage) {
      setFlashDialogOpen(false);
      await usbFirmwareService.disconnect();
      return;
    }

    // 3. fullPackage書き込み
    try {
      setFlashProgress({
        stage: 'flashing',
        percent: 50,
        message: '書き込み開始...'
      });

      const success = await usbFirmwareService.writeFullPackage(fullPackage, (progress: UsbFlashProgress) => {
        setFlashProgress({
          stage: progress.stage as FlashProgress['stage'],
          percent: progress.percent,
          message: progress.message,
          file: progress.file
        });
      });

      if (success) {
        setTimeout(() => {
          setFlashDialogOpen(false);
          alert('✓ USB書き込みが完了しました！\n\nESP32のENボタンを押して再起動してください。');
        }, 2000);
      } else {
        setFlashDialogOpen(false);
      }
    } catch (error) {
      setFlashDialogOpen(false);
      alert(`✗ USB書き込みエラー:\n${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      // 接続解除
      await usbFirmwareService.disconnect();
    }
  };

  /**
   * BLE用コンパイル
   * connectionType='ble'を指定してDigiCodeBLE.inoテンプレート使用
   */
  const executeCompileForBle = async (): Promise<Blob | null> => {
    setIsCompiling(true);
    setCompileLog([]);
    setCompileDialogOpen(true);
    setStatusBarState('compiling');
    setStatusBarMessage('BLE用ファームウェアをコンパイル中...');

    const addLog = (message: string) => {
      setCompileLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    try {
      addLog('BLE用コンパイル開始（DigiCodeBLE.inoテンプレート）...');

      // コードを解析してincludes, globals, setup, loopに分割
      const includeLines = generatedCode.match(/^#include\s+.+$/gm) || [];
      const includes = includeLines.join('\n');
      addLog(`#include: ${includeLines.length}件検出`);

      const extractFunctionBody = (code: string, functionName: string): string => {
        const regex = new RegExp(`void ${functionName}\\(\\)\\s*\\{`);
        const match = code.match(regex);
        if (!match) return '';

        const startIndex = match.index! + match[0].length;
        let braceCount = 1;
        let endIndex = startIndex;

        for (let i = startIndex; i < code.length && braceCount > 0; i++) {
          if (code[i] === '{') braceCount++;
          else if (code[i] === '}') braceCount--;
          endIndex = i;
        }

        return code.substring(startIndex, endIndex).trim();
      };

      const setupCode = extractFunctionBody(generatedCode, 'setup');
      const loopCode = extractFunctionBody(generatedCode, 'loop');

      const setupMatch = generatedCode.match(/void setup\(\)/);
      const globals = setupMatch
        ? generatedCode.substring(0, setupMatch.index).replace(/^#include\s+.+$\n?/gm, '').trim()
        : '';

      addLog(`グローバル変数: ${globals ? '検出' : 'なし'}`);
      addLog(`setup(): ${setupCode ? '検出' : 'なし'}`);
      addLog(`loop(): ${loopCode ? '検出' : 'なし'}`);

      addLog('サーバーにコンパイルリクエスト送信中（connectionType=ble）...');

      // BLE用コンパイル実行（connectionType='ble'を指定）
      const result = await compileService.compile(includes, globals, setupCode, loopCode, undefined, 'bin', 'ble');

      if (result.success && result.fullPackage) {
        // fullPackageのfirmwareだけを使用
        addLog('✓ BLE用コンパイル成功！');
        addLog(`ファームウェアサイズ: ${(result.fullPackage.firmware.size / 1024).toFixed(1)} KB`);

        refreshUsage();
        setIsCompiling(false);
        setCompileDialogOpen(false);
        setStatusBarState('success');
        setStatusBarMessage('BLE用コンパイル成功');

        return result.fullPackage.firmware;
      } else {
        addLog(`✗ コンパイルエラー: ${result.error || 'ファームウェアが取得できませんでした'}`);
        if (result.details) {
          addLog(`詳細: ${result.details}`);
        }
        setIsCompiling(false);
        setStatusBarState('error');
        setStatusBarMessage(result.error || 'コンパイル失敗');
        return null;
      }
    } catch (error) {
      addLog(`✗ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      setIsCompiling(false);
      setStatusBarState('error');
      setStatusBarMessage(error instanceof Error ? error.message : '不明なエラー');
      return null;
    }
  };

  /**
   * BLE書き込み処理
   * Rule 22に基づく実装:
   * - requestDevice()はユーザージェスチャーコンテキスト内で呼び出す
   * - bleFirmwareServiceを使用（firmwareService/usbFirmwareServiceとは独立）
   * - h2zero/NimBLEOtaプロトコル
   *
   * 重要: Web Bluetooth APIのrequestDevice()はユーザージェスチャーコンテキスト内でのみ呼び出し可能
   * そのため、順序は「1.デバイス選択 → 2.コンパイル → 3.書き込み」とする
   */
  const handleBleWrite = async () => {
    // 1. 先にBLEデバイス選択（ユーザージェスチャーコンテキスト内で実行必須）
    setFlashDialogOpen(true);
    setFlashProgress({
      stage: 'connecting',
      percent: 0,
      message: 'BLEデバイスを検索中...'
    });

    let deviceInfo: BleDeviceInfo | null = null;
    try {
      deviceInfo = await bleFirmwareService.connect((progress: BleFlashProgress) => {
        setFlashProgress({
          stage: progress.stage as FlashProgress['stage'],
          percent: progress.percent,
          message: progress.message
        });
      });

      if (!deviceInfo) {
        setFlashDialogOpen(false);
        return;
      }

      setFlashProgress({
        stage: 'connecting',
        percent: 30,
        message: `接続成功: ${deviceInfo.name}`
      });
    } catch (error) {
      setFlashDialogOpen(false);
      alert(`✗ BLE接続エラー:\n${error instanceof Error ? error.message : '不明なエラー'}`);
      return;
    }

    // 2. BLE用コンパイル（接続確認後）
    setFlashProgress({
      stage: 'preparing',
      percent: 35,
      message: 'BLE用ファームウェアをコンパイル中...'
    });

    const firmware = await executeCompileForBle();
    if (!firmware) {
      setFlashDialogOpen(false);
      await bleFirmwareService.disconnect();
      return;
    }

    // 3. BLE OTA書き込み
    try {
      setFlashProgress({
        stage: 'flashing',
        percent: 50,
        message: '書き込み開始...'
      });

      const success = await bleFirmwareService.writeOta(firmware, (progress: BleFlashProgress) => {
        setFlashProgress({
          stage: progress.stage as FlashProgress['stage'],
          percent: progress.percent,
          message: progress.message
        });
      });

      if (success) {
        setTimeout(() => {
          setFlashDialogOpen(false);
          alert('✓ BLE書き込みが完了しました！\n\nデバイスが自動的に再起動します。');
        }, 2000);
      } else {
        setFlashDialogOpen(false);
      }
    } catch (error) {
      setFlashDialogOpen(false);
      alert(`✗ BLE書き込みエラー:\n${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      // 接続解除
      await bleFirmwareService.disconnect();
    }
  };

  // 前回の選択を取得
  const getLastFlashMethod = (): FlashMethod => {
    return (localStorage.getItem('lastFlashMethod') as FlashMethod) || 'wifi';
  };

  // 選択を保存
  const saveLastFlashMethod = (method: FlashMethod) => {
    localStorage.setItem('lastFlashMethod', method);
  };

  // 書き込み方法選択ハンドラー（コンパイル前に実行）
  const handleFlashMethodSelect = async (method: FlashMethod) => {
    saveLastFlashMethod(method);
    setFlashMethodDialogOpen(false);

    switch (method) {
      case 'wifi': {
        // WiFi: デバイス選択ダイアログを表示（単一選択モード）
        setWifiDeviceSelectMultiMode(false);
        setWifiDeviceSelectDialogOpen(true);
        break;
      }
      case 'wifi-batch': {
        // 一括書込み: デバイス選択ダイアログを表示（複数選択モード）
        setPendingOtaBinary(null);
        setWifiDeviceSelectMultiMode(true);
        setWifiDeviceSelectDialogOpen(true);
        break;
      }
      case 'usb': {
        // USB書き込み: connectionType='usb'でコンパイル→USB経由で書き込み
        await handleUsbWrite();
        break;
      }
      case 'ble': {
        // BLE書き込み: connectionType='ble'でコンパイル→BLE経由で書き込み
        await handleBleWrite();
        break;
      }
    }

    setCompiledBinary(null);
  };

  // 接続状態に応じた色（いずれかの接続方式が接続されていれば表示）
  const getConnectionStatusColor = () => {
    // 接続中のものがあればそれを優先
    if (serialStatus === 'connected' || wifiStatus === 'connected') {
      return 'bg-green-500';
    }
    // 接続試行中
    if (serialStatus === 'connecting' || wifiStatus === 'connecting') {
      return 'bg-yellow-500 animate-pulse';
    }
    // エラー
    if (serialStatus === 'error' || wifiStatus === 'error') {
      return 'bg-red-500';
    }
    // 未接続
    return 'bg-gray-400';
  };

  // モバイル/タブレット用ツールバーコントロール
  const MobileToolbarControls = () => (
    <div className={isMobile ? 'flex flex-col gap-2 w-full' : 'flex items-center gap-1'}>
      {/* チュートリアルボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTutorialDialogOpen(true)}
        className="text-xs text-purple-600 w-full md:w-auto justify-start"
      >
        <GraduationCap className="w-3 h-3 mr-1" />
        チュートリアル
      </Button>

      {/* モード選択 */}
      <div className={isMobile ? 'w-full' : 'flex items-center'}>
        <RobotModeSelector />
      </div>

      {/* コンパイル＆書き込みボタン */}
      <Button
          variant="default"
          size="sm"
          onClick={handleCompile}
          disabled={isCompiling}
          className="bg-orange-600 hover:bg-orange-700 text-xs w-full md:w-auto"
        >
          {isCompiling ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              コンパイル中
            </>
          ) : (
            <>
              <Zap className="w-3 h-3 mr-1" />
              書き込み
            </>
          )}
        </Button>

      {/* USB接続ボタン */}
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => serialStatus === 'connected' ? disconnectSerial() : connectSerial()}
          className="text-xs"
        >
          {serialStatus === 'connected' ? 'USB切断' : 'USB接続'}
        </Button>
      </div>
    </div>
  );

  // デスクトップ用ツールバーコントロール（メニューバー形式）
  const DesktopToolbarControls = () => (
    <>
      {/* コンパイル＆書き込みメニュー */}
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="sm"
              disabled={isCompiling}
              className="bg-orange-600 hover:bg-orange-700 text-xs px-3"
            >
              {isCompiling ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  コンパイル中...
                </>
              ) : (
                <>
                  {serverMode === 'cloud' ? (
                    <Cloud className="w-3 h-3 mr-1" />
                  ) : (
                    <Server className="w-3 h-3 mr-1" />
                  )}
                  書き込み
                  {serverMode === 'cloud' && compileUsage && (
                    <span className={`ml-1 ${compileUsage.isOverLimit ? 'text-red-200' : 'text-orange-200'}`}>
                      ({compileUsage.count}/{compileUsage.limit})
                    </span>
                  )}
                  <ChevronDownIcon className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {/* 書き込み実行 */}
            <DropdownMenuItem
              onClick={handleCompile}
              disabled={isCompiling}
              className="font-medium"
            >
              <Zap className="w-4 h-4 mr-2 text-orange-500" />
              コンパイル＆書き込み
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* サーバー選択 */}
            <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.menu.compileServer')}</div>
            <DropdownMenuCheckboxItem
              checked={serverMode === 'cloud'}
              onCheckedChange={() => handleServerModeChange('cloud')}
            >
              <Cloud className="w-4 h-4 mr-2 text-blue-500" />
              {t('editor.menu.cloudRecommended')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={serverMode === 'local'}
              onCheckedChange={() => handleServerModeChange('local')}
            >
              <Server className="w-4 h-4 mr-2 text-purple-500" />
              {t('editor.menu.local')}
            </DropdownMenuCheckboxItem>

            {/* 使用量表示（クラウド選択時のみ） */}
            {serverMode === 'cloud' && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-2">
                  <div className="text-xs text-gray-500 mb-2">{t('editor.menu.monthlyUsage')}</div>
                  {compileUsage ? (
                    <div className="space-y-1">
                      <Progress
                        value={(compileUsage.count / compileUsage.limit) * 100}
                        className={`h-2 ${compileUsage.isOverLimit ? '[&>div]:bg-red-500' : ''}`}
                      />
                      <div className="flex justify-between text-xs">
                        <span className={compileUsage.isOverLimit ? 'text-red-500 font-medium' : ''}>
                          {t('editor.menu.usedCount', { count: compileUsage.count })}
                        </span>
                        <span className="text-gray-500">{t('editor.menu.limitCount', { limit: compileUsage.limit })}</span>
                      </div>
                      <p className={`text-xs ${compileUsage.isOverLimit ? 'text-red-500' : 'text-green-600'}`}>
                        {compileUsage.isOverLimit
                          ? t('editor.menu.limitReached')
                          : t('editor.menu.remaining', { count: compileUsage.remaining })
                        }
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">{t('editor.menu.loginToView')}</p>
                  )}
                </div>
              </>
            )}

            {serverMode === 'local' && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-2 text-xs text-gray-500">
                  {t('editor.menu.noLimitLocal')}
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

      {/* 接続メニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs px-2">
            <div className={`w-2 h-2 rounded-full mr-1 ${getConnectionStatusColor()}`} />
            {t('editor.menu.connection')}
            <ChevronDownIcon className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setWifiSetupDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            {t('editor.menu.wifiRouterConnect')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ファイルメニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs px-2">
            {t('editor.menu.file')}
            <ChevronDownIcon className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-50">
          <DropdownMenuItem onClick={handleNew}>
            <FilePlus className="w-4 h-4 mr-2" />
            {t('editor.menu.new')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpen}>
            <FolderOpen className="w-4 h-4 mr-2" />
            {t('editor.menu.open')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSampleDialogOpen(true)} className="text-purple-600">
            <FileCode className="w-4 h-4 mr-2" />
            {t('editor.sample')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSave}>
            <Download className="w-4 h-4 mr-2" />
            {t('editor.menu.save')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 表示メニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs px-2">
            {t('editor.menu.view')}
            <ChevronDownIcon className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem
            checked={showSerialMonitor}
            onCheckedChange={setShowSerialMonitor}
          >
            <Terminal className="w-4 h-4 mr-2" />
            {t('editor.menu.serialMonitor')}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showSerialPlotter}
            onCheckedChange={setShowSerialPlotter}
          >
            <LineChart className="w-4 h-4 mr-2" />
            {t('editor.menu.plotter')}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 設定メニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs px-2">
            {t('editor.menu.settings')}
            <ChevronDownIcon className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.menu.mode')}</div>
          <div className="px-2 pb-2">
            <RobotModeSelector />
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.menu.compileTargetBoard')}</div>
          <div className="px-2 pb-2">
            <BoardSelector />
          </div>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.menu.displayLanguage')}</div>
          <div className="px-2 pb-2">
            <LocaleSelector />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ヘルプメニュー */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs px-2">
            {t('editor.menu.help')}
            <ChevronDownIcon className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setTutorialDialogOpen(true)} className="text-purple-600">
            <GraduationCap className="w-4 h-4 mr-2" />
            {t('editor.menu.tutorial')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  // モバイル/タブレット用下部パネル
  const MobileBottomPanel = () => (
    <div className={`bg-white border-t transition-all duration-300 ${bottomPanelExpanded ? 'h-72' : 'h-12'}`}>
      {/* パネルヘッダー */}
      <div className="flex items-center justify-between px-2 h-12 border-b">
        <Tabs value={activeBottomTab} onValueChange={setActiveBottomTab} className="flex-1">
          <TabsList className="h-9">
            <TabsTrigger value="code" className="text-xs px-2">
              <Code className="w-3 h-3 mr-1" />
              {t('editor.bottom.code')}
            </TabsTrigger>
            <TabsTrigger value="monitor" className="text-xs px-2">
              <Terminal className="w-3 h-3 mr-1" />
              {t('editor.bottom.monitor')}
            </TabsTrigger>
            <TabsTrigger value="plotter" className="text-xs px-2">
              <LineChart className="w-3 h-3 mr-1" />
              {t('editor.bottom.plotter')}
            </TabsTrigger>
            <TabsTrigger value="pid" className="text-xs px-2">
              <SlidersHorizontal className="w-3 h-3 mr-1" />
              {t('editor.bottom.pid')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBottomPanelExpanded(!bottomPanelExpanded)}
          className="ml-2"
        >
          {bottomPanelExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </Button>
      </div>

      {/* パネルコンテンツ */}
      {bottomPanelExpanded && (
        <div className="h-[calc(100%-3rem)] overflow-hidden">
          {activeBottomTab === 'code' && (
            <CodePreview
              code={generatedCode}
              language="cpp"
              className="h-full"
            />
          )}
          {activeBottomTab === 'monitor' && (
            <SerialMonitor className="h-full" />
          )}
          {activeBottomTab === 'plotter' && (
            <SerialPlotter className="h-full" />
          )}
          {activeBottomTab === 'pid' && (
            <PIDTuningPanel className="h-full overflow-y-auto" />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ツールバー（Linear風ミニマルデザイン） */}
      <LinearToolbar
        projectTitle={currentProject?.title}
        onProjectSelect={handleOpen}
        onNewProject={handleNew}
        onSampleProject={() => setSampleDialogOpen(true)}
        onSaveProject={handleSave}
        isSaving={false}
        isCompiling={isCompiling}
        serverMode={serverMode}
        compileUsage={compileUsage ?? undefined}
        onCompile={handleCompile}
        onServerModeChange={setServerMode}
        onRobotModeChange={() => {
          // ロボットモード変更時、BlocklyEditorが自動的にツールボックスを更新します
        }}
      />

      {/* メインコンテンツ */}
      {isMobileOrTablet ? (
        // モバイル/タブレットレイアウト
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Blocklyエディタ（フルスクリーン） */}
          <div className="flex-1">
            <BlocklyEditor
              ref={blocklyEditorRef}
              initialXml={workspaceXml}
              onWorkspaceChange={handleWorkspaceChange}
            />
          </div>

          {/* 下部パネル（タブ切り替え式） */}
          <MobileBottomPanel />
        </div>
      ) : (
        // デスクトップレイアウト
        <div className="flex flex-1 overflow-hidden">
          {/* サイドバー */}
          <Sidebar
            isAuthenticated={isAuthenticated}
            onProjectOpen={handleOpen}
            onBleFirmwareWrite={handleBleFirmwareWrite}
            onWifiPrerequisites={() => setWifiPrerequisitesDialogOpen(true)}
            onWifiFirmwareWrite={handleWifiFirmwareWrite}
            onApSetup={() => setWifiSetupDialogOpen(true)}
            onDeviceName={() => setDeviceNameDialogOpen(true)}
            onUsbPortRelease={handleUsbPortRelease}
            onServoTrim={() => setServoTrimDialogOpen(true)}
            onPinAssignment={() => setPinSettingsDialogOpen(true)}
            onCompileServerSettings={() => setCompileServerSettingsDialogOpen(true)}
            onDocs={() => window.open('/docs', '_blank')}
            onCodePreview={() => setCodePreviewDialogOpen(true)}
            onPidTuning={() => setPidTuningDialogOpen(true)}
            onUsbDriver={() => window.open('https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers', '_blank')}
            onLogin={() => navigate('/auth')}
            onLogout={handleLogout}
            onPasskeyRegister={handlePasskeyRegister}
            onTwoFactorSettings={handleTwoFactorSettings}
            onAccountDelete={handleAccountDelete}
          />

          {/* メインコンテンツエリア (Blocklyワークスペース) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Blocklyエディタ */}
            <div className="flex-1">
              <BlocklyEditor
                ref={blocklyEditorRef}
                initialXml={workspaceXml}
                onWorkspaceChange={handleWorkspaceChange}
              />
            </div>

            {/* 下部パネル（シリアルモニター/プロッター） */}
            {(showSerialMonitor || showSerialPlotter) && (
              <div className="h-64 border-t flex">
                <Tabs defaultValue="monitor" className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between px-2 border-b bg-gray-50">
                    <TabsList className="h-9">
                      {showSerialMonitor && (
                        <TabsTrigger value="monitor" className="text-xs px-3">
                          <Terminal className="w-3 h-3 mr-1" />
                          {t('editor.bottom.monitor')}
                        </TabsTrigger>
                      )}
                      {showSerialPlotter && (
                        <TabsTrigger value="plotter" className="text-xs px-3">
                          <LineChart className="w-3 h-3 mr-1" />
                          {t('editor.bottom.plotter')}
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {showSerialMonitor && (
                      <TabsContent value="monitor" className="h-full m-0 p-0">
                        <SerialMonitor className="h-full" />
                      </TabsContent>
                    )}
                    {showSerialPlotter && (
                      <TabsContent value="plotter" className="h-full m-0 p-0">
                        <SerialPlotter className="h-full" />
                      </TabsContent>
                    )}
                  </div>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 保存ダイアログ */}
      <SaveProjectDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        blocklyXml={workspaceXml}
        generatedCode={generatedCode}
        onSaved={handleSaved}
      />

      {/* プロジェクト一覧ダイアログ */}
      <ProjectListDialog
        open={openDialogOpen}
        onOpenChange={setOpenDialogOpen}
        onSelect={handleProjectSelect}
      />

      {/* サンプルプロジェクトダイアログ */}
      <SampleProjectsDialog
        open={sampleDialogOpen}
        onOpenChange={setSampleDialogOpen}
        onSelectSample={handleSampleSelect}
      />

      {/* コンパイルログダイアログ */}
      <Dialog open={compileDialogOpen} onOpenChange={(open) => !isCompiling && setCompileDialogOpen(open)}>
        <DialogContent
          className="sm:max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
          hideCloseButton={isCompiling}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isCompiling && <Loader2 className="h-4 w-4 animate-spin" />}
              {compileLog.some(log => log.includes('[接続確認]')) && !compileLog.some(log => log.includes('コード解析'))
                ? (isCompiling ? '接続確認中...' : '接続確認結果')
                : `コンパイル${isCompiling ? '中...' : '結果'}`}
            </DialogTitle>
            <DialogDescription>
              {compileLog.some(log => log.includes('[接続確認]')) && !compileLog.some(log => log.includes('コード解析'))
                ? 'WiFiデバイスへの接続を確認しています'
                : 'Arduino C++コードをESP32用にコンパイルしています'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 p-3 rounded-md font-mono text-xs max-h-64 overflow-y-auto">
              {compileLog.length === 0 ? (
                <div className="text-gray-400 dark:text-gray-500">ログを待機中...</div>
              ) : (
                compileLog.map((log, index) => (
                  <div key={index} className={log.includes('✗') ? 'text-red-600 dark:text-red-400' : log.includes('✓') ? 'text-green-600 dark:text-green-400' : ''}>
                    {log}
                  </div>
                ))
              )}
            </div>
            {!isCompiling && compileLog.some(log => log.includes('✗')) && (
              <Button
                onClick={() => setCompileDialogOpen(false)}
                className="w-full"
                variant="destructive"
              >
                {t('common.close')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* OTA更新進捗ダイアログ */}
      <Dialog
        open={flashDialogOpen}
        onOpenChange={(open) => {
          // 書き込み中（flashing, erasing）は閉じられないようにする
          // connecting, verifying, complete, error の場合のみ閉じることを許可
          const isCriticalStage = flashProgress.stage === 'flashing' || flashProgress.stage === 'erasing';
          if (!open && isCriticalStage) {
            // 書き込み中は閉じない
            return;
          }
          setFlashDialogOpen(open);
        }}
      >
        <DialogContent
          className="sm:max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
          // 書き込み中はXボタンを非表示にする
          hideCloseButton={flashProgress.stage === 'flashing' || flashProgress.stage === 'erasing'}
        >
          <DialogHeader>
            <DialogTitle>
              {t('editor.flash.writingToEsp32')}
            </DialogTitle>
            <DialogDescription>
              {flashProgress.stage === 'connecting' && t('editor.connecting')}
              {flashProgress.stage === 'erasing' && t('editor.erasingFlash')}
              {flashProgress.stage === 'flashing' && t('editor.writing')}
              {flashProgress.stage === 'verifying' && t('editor.writing')}
              {flashProgress.stage === 'complete' && t('editor.complete')}
              {flashProgress.stage === 'error' && t('editor.errorOccurred')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Progress value={flashProgress.percent} className="w-full" />
            <div className="text-sm text-center text-muted-foreground">
              {flashProgress.message}
            </div>
            {flashProgress.file && (
              <div className="text-xs text-center text-muted-foreground">
                {flashProgress.file}
              </div>
            )}
            <div className="text-center text-lg font-semibold">
              {Math.floor(flashProgress.percent)}%
            </div>
            {/* 書き込み中は警告メッセージを表示 */}
            {(flashProgress.stage === 'flashing' || flashProgress.stage === 'erasing') && (
              <div className="text-xs text-center text-amber-600 dark:text-amber-400">
                ⚠️ {t('editor.flash.doNotClose', '書き込み中は画面を閉じないでください')}
              </div>
            )}
            {flashProgress.stage === 'error' && (
              <Button
                onClick={() => setFlashDialogOpen(false)}
                className="w-full"
                variant="destructive"
              >
                {t('common.close')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* デバイス選択ダイアログ（複数選択・一括更新用） */}
      <DeviceSelectDialog
        open={batchSelectDialogOpen}
        onOpenChange={setBatchSelectDialogOpen}
        onSelect={() => {}} // 複数選択モードでは使用しない
        multiSelect={true}
        onSelectMultiple={handleBatchDeviceSelect}
      />

      {/* 一括更新進捗ダイアログ */}
      <BatchUpdateDialog
        open={batchUpdateDialogOpen}
        onOpenChange={setBatchUpdateDialogOpen}
        devices={batchUpdateDevices}
        binData={pendingOtaBinary}
        onComplete={handleBatchUpdateComplete}
      />

      {/* 書き込み方法選択ダイアログ */}
      <Dialog open={flashMethodDialogOpen} onOpenChange={setFlashMethodDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Zap className="h-5 w-5" />
              {t('editor.flash.title')}
            </DialogTitle>
            <DialogDescription>
              {t('editor.flash.selectMethod')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('editor.flash.selectMethodPrompt')}</p>

            {/* 現在選択されているボードの対応書き込み方法を取得 */}
            {(() => {
              const selectedBoard = getSelectedBoard();
              const supportedMethods = selectedBoard.supportedFlashMethods;

              return (
                <>
                  {/* WiFi OTA */}
                  {supportedMethods.includes('wifi') && (
                    <button
                      onClick={() => handleFlashMethodSelect('wifi')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-300 dark:hover:border-purple-700 ${
                        getLastFlashMethod() === 'wifi' ? 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Wifi className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{t('editor.flash.wifiOta')}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('editor.flash.wifiOtaDesc')}</div>
                      </div>
                      {getLastFlashMethod() === 'wifi' && (
                        <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded">{t('editor.flash.previous')}</span>
                      )}
                    </button>
                  )}

                  {/* WiFi OTA一括更新 */}
                  {supportedMethods.includes('wifi-batch') && (
                        <button
                          onClick={() => handleFlashMethodSelect('wifi-batch')}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-orange-50 dark:hover:bg-orange-950 hover:border-orange-300 dark:hover:border-orange-700 ${
                            getLastFlashMethod() === 'wifi-batch' ? 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950' : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                            <Wifi className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">{t('editor.flash.wifiBatch')}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('editor.flash.wifiBatchDesc')}</div>
                          </div>
                          {getLastFlashMethod() === 'wifi-batch' && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900 px-2 py-0.5 rounded">{t('editor.flash.previous')}</span>
                          )}
                        </button>
                      )}

                  {/* USB直接書き込み */}
                  {supportedMethods.includes('usb') && (
                    <button
                      onClick={() => handleFlashMethodSelect('usb')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-700 ${
                        getLastFlashMethod() === 'usb' ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Usb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{t('editor.flash.usb')}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('editor.flash.usbDesc')}</div>
                      </div>
                      {getLastFlashMethod() === 'usb' && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">{t('editor.flash.previous')}</span>
                      )}
                    </button>
                  )}

                  {/* BLE書き込み */}
                  {supportedMethods.includes('ble') && (
                    <button
                      onClick={() => handleFlashMethodSelect('ble')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-violet-50 dark:hover:bg-violet-950 hover:border-violet-300 dark:hover:border-violet-700 ${
                        getLastFlashMethod() === 'ble' ? 'border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                        <Bluetooth className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">Bluetooth書き込み</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Chrome/Edge推奨、初回USB必須</div>
                      </div>
                      {getLastFlashMethod() === 'ble' && (
                        <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900 px-2 py-0.5 rounded">{t('editor.flash.previous')}</span>
                      )}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* チュートリアル選択ダイアログ */}
      <TutorialSelectDialog
        open={tutorialDialogOpen}
        onOpenChange={setTutorialDialogOpen}
      />

      {/* WiFi OTA必要ソフトの準備ダイアログ */}
      <WifiPrerequisitesDialog
        open={wifiPrerequisitesDialogOpen}
        onOpenChange={setWifiPrerequisitesDialogOpen}
      />

      {/* Wifiルータに接続ダイアログ */}
      <WifiSetupDialog
        open={wifiSetupDialogOpen}
        onOpenChange={setWifiSetupDialogOpen}
      />

      {/* デバイス名設定ダイアログ */}
      <DeviceNameDialog
        open={deviceNameDialogOpen}
        onOpenChange={setDeviceNameDialogOpen}
      />

      {/* WiFiデバイス選択ダイアログ */}
      <WifiDeviceSelectDialog
        open={wifiDeviceSelectDialogOpen}
        onOpenChange={setWifiDeviceSelectDialogOpen}
        onDeviceSelect={handleWifiDeviceSelected}
        multiSelect={wifiDeviceSelectMultiMode}
        onMultiDeviceSelect={handleWifiMultiDeviceSelected}
      />

      {/* ファームウェアインストーラーダイアログ */}
      <FirmwareInstallerDialog
        open={firmwareInstallerDialogOpen}
        onOpenChange={setFirmwareInstallerDialogOpen}
        defaultFirmwareType={firmwareDialogDefaultType}
      />

      {/* ピンアサイン設定ダイアログ */}
      <PinSettingsDialog
        open={pinSettingsDialogOpen}
        onOpenChange={setPinSettingsDialogOpen}
      />

      {/* サーボトリム設定ダイアログ */}
      <ServoTrimDialog
        open={servoTrimDialogOpen}
        onOpenChange={setServoTrimDialogOpen}
      />

      {/* コンパイルサーバー設定ダイアログ */}
      <CompileServerSettingsDialog
        open={compileServerSettingsDialogOpen}
        onOpenChange={setCompileServerSettingsDialogOpen}
      />

      {/* 生成コードプレビューダイアログ */}
      <Dialog open={codePreviewDialogOpen} onOpenChange={setCodePreviewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              {t('editor.generatedCode')}
            </DialogTitle>
            <DialogDescription>
              {t('editor.codePreview.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <CodePreview
              code={generatedCode}
              language="cpp"
              className="h-[60vh]"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* PIDチューニングダイアログ */}
      <Dialog open={pidTuningDialogOpen} onOpenChange={setPidTuningDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              {t('editor.bottom.pidTuning')}
            </DialogTitle>
            <DialogDescription>
              {t('editor.bottom.pidTuningDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <PIDTuningPanel />
          </div>
        </DialogContent>
      </Dialog>

      {/* チュートリアルオーバーレイ */}
      <TutorialOverlay />

      {/* パスキー管理ダイアログ */}
      <PasskeyManagementDialog
        open={passkeyRegisterDialogOpen}
        onOpenChange={setPasskeyRegisterDialogOpen}
      />

      {/* アカウント削除ダイアログ */}
      <AccountDeleteDialog
        open={accountDeleteDialogOpen}
        onOpenChange={setAccountDeleteDialogOpen}
      />

      {/* 2段階認証設定ダイアログ */}
      <TwoFactorSettingsDialog
        open={twoFactorSettingsDialogOpen}
        onOpenChange={setTwoFactorSettingsDialogOpen}
      />

      {/* ADC2警告ダイアログ */}
      <AlertDialog open={adc2WarningDialogOpen} onOpenChange={setAdc2WarningDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              {t('editor.adc2Warning.title')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">{t('editor.adc2Warning.description')}</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 space-y-2">
                  {adc2Warnings.map((warning, index) => (
                    <p key={index} className="text-sm text-yellow-800">
                      <span className="font-semibold">GPIO{warning.pin}:</span> {t('editor.adc2Warning.pinWarning')}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-gray-500">{t('editor.adc2Warning.recommendation')}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('editor.adc2Warning.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithCompile} className="bg-yellow-600 hover:bg-yellow-700">
              {t('editor.adc2Warning.proceed')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ステータスバー */}
      <StatusBar
        state={statusBarState}
        message={statusBarMessage}
        binarySize={compiledBinary?.size}
        deviceInfo={{
          connected: wifiStatus === 'connected' || serialStatus === 'connected',
          name: wifiStatus === 'connected' ? 'WiFi Device' : serialStatus === 'connected' ? 'USB Device' : undefined,
        }}
      />
    </div>
  );
}
