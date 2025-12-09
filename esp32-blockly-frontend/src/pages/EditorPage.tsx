import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BlocklyEditor } from '@/components/editor/BlocklyEditor';
import type { BlocklyEditorRef } from '@/components/editor/BlocklyEditor';
import { CodePreview } from '@/components/editor/CodePreview';
import { LinearToolbar } from '@/components/editor/LinearToolbar';
import { StatusBar, type StatusBarState } from '@/components/editor/StatusBar';
import { Sidebar } from '@/components/editor/Sidebar';
import { LanguageSelector } from '@/components/editor/LanguageSelector';
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
import { FirmwareInstallerDialog } from '@/components/firmware/FirmwareInstallerDialog';
import { PinSettingsDialog } from '@/components/pins/PinSettingsDialog';
import { CompileServerSettingsDialog } from '@/components/settings/CompileServerSettingsDialog';
import { UsbPortReleaseDialog } from '@/components/settings/UsbPortReleaseDialog';
import { UsbDriverDialog } from '@/components/settings/UsbDriverDialog';
import { HeaderDeviceSelector } from '@/components/device/HeaderDeviceSelector';
import { useProjectStore } from '@/stores/projectStore';
import { useSerialStore } from '@/stores/serialStore';
import { useWifiStore } from '@/stores/wifiStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { useBluetoothStore } from '@/stores/bluetoothStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { useBoardStore, type FlashMethod } from '@/stores/boardStore';
import { getTutorialById } from '@/data/tutorials';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { Project } from '@/stores/projectStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { compileService, type CompileServerMode, type FullPackage } from '@/services/compileService';
import { api } from '@/lib/api';
import { firmwareService, type FlashProgress } from '@/services/firmwareService';
import { Download, Loader2, Zap, SlidersHorizontal, LineChart, Code, Terminal, ChevronUp, ChevronDown, GraduationCap, ChevronDown as ChevronDownIcon, X, FilePlus, FolderOpen, FileCode, Cloud, Server, Usb, Wifi, Bluetooth, Check, Settings2, Pin, BookOpen, Globe } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';

export function EditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentProject, loadProject, setCurrentProject } = useProjectStore();
  const { status: serialStatus, connect: connectSerial, disconnect: disconnectSerial } = useSerialStore();
  const { status: wifiStatus, getDeviceUrl, setHost, setDeviceName, connect: connectWifi } = useWifiStore();
  const { status: bluetoothStatus, connect: connectBluetooth, disconnect: disconnectBluetooth } = useBluetoothStore();
  const { addDevice } = useDeviceStore();
  const { language, setLanguage } = useLanguageStore();
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
  const [isWaitingForBootMode, setIsWaitingForBootMode] = useState(false);
  const [pendingFlashBinary, setPendingFlashBinary] = useState<Blob | FullPackage | null>(null);
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
  const [firmwareInstallerDialogOpen, setFirmwareInstallerDialogOpen] = useState(false);
  const [pinSettingsDialogOpen, setPinSettingsDialogOpen] = useState(false);
  const [compileServerSettingsDialogOpen, setCompileServerSettingsDialogOpen] = useState(false);
  const [usbPortReleaseDialogOpen, setUsbPortReleaseDialogOpen] = useState(false);
  const [usbDriverDialogOpen, setUsbDriverDialogOpen] = useState(false);
  const [flashMethodDialogOpen, setFlashMethodDialogOpen] = useState(false);
  const [compiledBinary, setCompiledBinary] = useState<Blob | null>(null);
  const [codePreviewDialogOpen, setCodePreviewDialogOpen] = useState(false);
  const [pidTuningDialogOpen, setPidTuningDialogOpen] = useState(false);
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
  const compiledBinaryRef = useRef<ArrayBuffer | null>(null);
  const prevLanguageRef = useRef(language);
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

    // 使用量を取得
    const fetchUsage = async () => {
      const token = localStorage.getItem('auth_token');
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

  // コンパイル成功後に使用量を再取得
  const refreshUsage = async () => {
    const token = localStorage.getItem('auth_token');
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

  // URLパラメータからプロジェクトIDを取得して読み込み
  useEffect(() => {
    const projectId = searchParams.get('id');
    if (projectId) {
      const id = parseInt(projectId);
      if (!isNaN(id)) {
        loadProject(id).then((project) => {
          if (project) {
            setWorkspaceXml(project.blocklyXml);
            setGeneratedCode(project.generatedCode || '');
            // 言語を復元
            if (project.language) {
              setLanguage(project.language);
            }
            // BlocklyEditorに反映
            if (blocklyEditorRef.current) {
              blocklyEditorRef.current.loadXml(project.blocklyXml);
            }
          }
        });
      }
    }
  }, [searchParams, loadProject, setLanguage]);

  // 現在のプロジェクトが変更された時にワークスペースを更新
  useEffect(() => {
    if (currentProject) {
      setWorkspaceXml(currentProject.blocklyXml);
      setGeneratedCode(currentProject.generatedCode || '');
      // 言語を復元
      if (currentProject.language) {
        setLanguage(currentProject.language);
      }
      // BlocklyEditorに反映
      if (blocklyEditorRef.current) {
        blocklyEditorRef.current.loadXml(currentProject.blocklyXml);
      }
    }
  }, [currentProject, setLanguage]);

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

  // 言語変更時にワークスペースをクリア（Arduino C++とMicroPythonのブロックには互換性がないため）
  useEffect(() => {
    if (prevLanguageRef.current !== language) {
      // 確認ダイアログはLanguageSelectorで表示済みなので、ここではクリアのみ実行
      setWorkspaceXml('<xml></xml>');
      setGeneratedCode('');
      if (blocklyEditorRef.current) {
        blocklyEditorRef.current.loadXml('<xml></xml>');
      }
      // 現在のプロジェクトをクリア（新しい言語では使えないため）
      setCurrentProject(null);
      navigate('/editor', { replace: true });
      prevLanguageRef.current = language;
    }
  }, [language, navigate, setCurrentProject]);

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
  const handleFirmwareWrite = () => {
    setFirmwareInstallerDialogOpen(true);
  };

  // プロジェクト選択
  const handleProjectSelect = (project: Project) => {
    setWorkspaceXml(project.blocklyXml);
    setGeneratedCode(project.generatedCode || '');
    setIsDirty(false);
    // BlocklyEditorに反映
    if (blocklyEditorRef.current) {
      blocklyEditorRef.current.loadXml(project.blocklyXml);
    }
    // URLを更新
    navigate(`/editor?id=${project.id}`, { replace: true });
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
      if (language === 'arduino' && generatedCode.trim()) {
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
    // 言語を設定
    setLanguage(sample.language);
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
    if (currentProject) {
      navigate(`/editor?id=${currentProject.id}`, { replace: true });
    }
  };

  // デバイス接続確認（コンパイル前チェック用）
  const checkDeviceConnection = async (deviceUrl: string): Promise<{ ok: boolean; resolvedUrl?: string; error?: string }> => {
    try {
      // .localドメインの場合、mDNS解決を先に行う
      let resolvedUrl = deviceUrl;
      if (deviceUrl.includes('.local')) {
        const hostname = new URL(deviceUrl).hostname;
        const resolvedIp = await firmwareService.resolveMdns(hostname);
        if (resolvedIp) {
          resolvedUrl = `http://${resolvedIp}`;
        } else {
          return { ok: false, error: `デバイス「${hostname}」が見つかりません。電源とWiFi接続を確認してください。` };
        }
      }

      // デバイスにping
      const online = await firmwareService.checkDeviceOnline(resolvedUrl, 5000);
      if (!online) {
        return { ok: false, error: 'デバイスが応答しません。電源とWiFi接続を確認してください。' };
      }

      return { ok: true, resolvedUrl };
    } catch (error) {
      return { ok: false, error: `接続確認エラー: ${error instanceof Error ? error.message : '不明なエラー'}` };
    }
  };

  // コンパイル＆書き込み - WiFiの場合は先に接続確認
  const handleCompile = async () => {
    // Arduino言語のときのみコンパイル可能
    if (language !== 'arduino') {
      alert(t('editor.arduinoOnly'));
      return;
    }

    if (!generatedCode.trim()) {
      alert(t('editor.noCodeToCompile'));
      return;
    }

    const lastMethod = getLastFlashMethod();

    // 前回WiFiを選択していて、デバイスが選択されている場合は即座に接続確認
    if (lastMethod === 'wifi' && wifiStatus === 'connected') {
      const deviceUrl = getDeviceUrl();

      // 接続確認ダイアログを表示
      setCompileLog([
        '[接続確認] WiFi OTA書込みが選択されています',
        `[接続確認] 書込み先: ${deviceUrl}`,
        '[接続確認] デバイスの接続状態を確認中...'
      ]);
      setCompileDialogOpen(true);
      setIsCompiling(true);

      // mDNS解決のログを追加
      if (deviceUrl.includes('.local')) {
        setCompileLog(prev => [...prev, '[接続確認] mDNSでIPアドレスを解決中...']);
      }

      const checkResult = await checkDeviceConnection(deviceUrl);
      if (!checkResult.ok) {
        setCompileLog(prev => [...prev, `[接続確認] ✗ ${checkResult.error}`]);
        setIsCompiling(false);
        // 3秒待ってからalertとダイアログ切替
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert(`デバイス接続エラー: ${checkResult.error}\n\nコンパイルチケットを節約するため、コンパイルは実行されませんでした。\n\n別の書き込み方法を選択するか、デバイスの電源とWiFi接続を確認してください。`);
        // 書込み方法選択ダイアログを表示して別の方法を選べるようにする
        setCompileDialogOpen(false);
        setFlashMethodDialogOpen(true);
        return;
      }

      setCompileLog(prev => [
        ...prev,
        checkResult.resolvedUrl ? `[接続確認] ✓ IPアドレス解決: ${checkResult.resolvedUrl}` : '',
        '[接続確認] ✓ デバイス応答確認OK',
        '[接続確認] → コンパイルを開始します...'
      ].filter(Boolean));

      // 1秒待ってコンパイルへ遷移（ログが見えるように）
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCompileDialogOpen(false);
      setIsCompiling(false);

      // 接続確認OK→コンパイル実行→書込み
      const binary = await executeCompile();
      if (binary) {
        await handleOtaUpdate(binary, deviceUrl);
      }
      return;
    }

    // WiFi以外、またはデバイス未選択の場合は書込み方法選択ダイアログを表示
    setFlashMethodDialogOpen(true);
  };

  // 実際のコンパイル処理（書込み方法選択後に呼ばれる）
  const executeCompile = async (format: 'bin' | 'uf2' = 'bin'): Promise<Blob | FullPackage | null> => {
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
        // fullPackageがある場合は、4ファイル全部を含むfullPackageを返す
        // そうでない場合は従来のbinaryを返す
        const compiledData = result.fullPackage || result.binary;

        if (!compiledData) {
          addLog('✗ コンパイルエラー: バイナリデータが取得できませんでした');
          setIsCompiling(false);
          setStatusBarState('error');
          setStatusBarMessage('バイナリデータが取得できませんでした');
          return null;
        }

        // サイズ表示用にfirmwareのサイズを取得
        const firmwareSize = result.fullPackage
          ? result.fullPackage.firmware.size
          : (result.binary?.size || 0);

        addLog('✓ コンパイル成功！');
        addLog(`バイナリサイズ: ${(firmwareSize / 1024).toFixed(1)} KB`);
        if (result.fullPackage) {
          addLog('📦 fullPackageモード: 4ファイル（bootloader, partitions, boot_app0, firmware）取得');
        }

        // fullPackageの場合はfirmware.binだけを保存（OTA用）
        compiledBinaryRef.current = result.fullPackage?.firmware || result.binary || null;

        // 使用量を再取得
        refreshUsage();

        setIsCompiling(false);
        setCompileDialogOpen(false);
        setStatusBarState('success');
        setStatusBarMessage(t('status.compileSuccess'));

        return compiledData;
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

  // USB書き込み処理
  const handleFlash = async (data: Blob | FullPackage) => {
    // BOOT準備画面を表示
    setPendingFlashBinary(data);
    setIsWaitingForBootMode(true);
    setFlashDialogOpen(true);
  };

  // BOOT準備完了後に実際の書き込みを開始
  const executeFlash = async () => {
    if (!pendingFlashBinary) return;

    setIsWaitingForBootMode(false);
    setFlashProgress({
      stage: 'connecting',
      percent: 0,
      message: 'ESP32に接続しています...'
    });
    setStatusBarState('uploading');
    setStatusBarMessage(t('status.flashingFirmware'));

    try {
      // ESP32に接続
      const chipInfo = await firmwareService.connect((progress) => {
        setFlashProgress(progress);
      });

      if (!chipInfo) {
        setFlashDialogOpen(false);
        alert('✗ ESP32への接続に失敗しました。\nデバイスが接続されているか確認してください。');
        return;
      }

      // BlobかFullPackageかを判定して処理
      let flashData: ArrayBuffer | FullPackage;
      if (pendingFlashBinary instanceof Blob) {
        // Blobの場合はArrayBufferに変換
        flashData = await pendingFlashBinary.arrayBuffer();
      } else {
        // FullPackageの場合はそのまま渡す
        flashData = pendingFlashBinary;
      }

      // 書き込み実行
      const success = await firmwareService.flashArduinoFirmware(flashData, (progress) => {
        setFlashProgress(progress);
      });

      if (success) {
        // 成功後、少し待ってからダイアログを閉じる
        setTimeout(() => {
          setFlashDialogOpen(false);
          setPendingFlashBinary(null);
          alert('✓ ファームウェアの書き込みが完了しました！\nESP32が再起動します。');
        }, 2000);
      } else {
        setFlashDialogOpen(false);
        setPendingFlashBinary(null);
        alert('✗ 書き込みに失敗しました。');
      }
    } catch (error) {
      setFlashDialogOpen(false);
      setPendingFlashBinary(null);
      alert(`✗ 書き込みエラー:\n${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  // 複数デバイス選択後の処理（一括更新）
  const handleBatchDeviceSelect = (devices: DigiCodeDevice[]) => {
    setBatchUpdateDevices(devices);
    setBatchSelectDialogOpen(false);
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

  // 前回の選択を取得
  const getLastFlashMethod = (): FlashMethod => {
    return (localStorage.getItem('lastFlashMethod') as FlashMethod) || 'usb';
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
      case 'usb': {
        // USB: コンパイル→書込み
        const binary = await executeCompile();
        if (binary) {
          await handleFlash(binary);
        }
        break;
      }
      case 'wifi': {
        // WiFi: デバイス接続確認→コンパイル→書込み
        if (wifiStatus === 'connected') {
          const deviceUrl = getDeviceUrl();

          // コンパイル前にデバイス接続確認
          setCompileLog(['[接続確認] デバイスの接続状態を確認中...']);
          setCompileDialogOpen(true);
          setIsCompiling(true);

          const checkResult = await checkDeviceConnection(deviceUrl);
          if (!checkResult.ok) {
            setCompileLog(prev => [...prev, `[接続確認] ✗ ${checkResult.error}`]);
            setIsCompiling(false);
            alert(`デバイス接続エラー: ${checkResult.error}\n\nコンパイルチケットを節約するため、コンパイルは実行されませんでした。`);
            return;
          }

          setCompileLog(prev => [...prev, '[接続確認] ✓ デバイス接続OK']);
          setCompileDialogOpen(false);
          setIsCompiling(false);

          // 接続確認OK→コンパイル実行
          const binary = await executeCompile();
          if (binary) {
            await handleOtaUpdate(binary, deviceUrl);
          }
        } else {
          // デバイス未選択の場合はエラーメッセージを表示
          setCompileLog(prev => [...prev, '[エラー] デバイスが選択されていません']);
          setIsCompiling(false);
          alert('デバイスが選択されていません。ヘッダーメニューの書き込みデバイスからデバイスを選択してください。');
        }
        break;
      }
      case 'wifi-batch': {
        // 一括書込み: デバイス選択ダイアログを表示
        setPendingOtaBinary(null);
        setBatchSelectDialogOpen(true);
        break;
      }
      case 'download-bin': {
        // .binダウンロード: コンパイル→ダウンロード
        const compiledData = await executeCompile();
        if (compiledData) {
          const filename = currentProject?.title
            ? `${currentProject.title}.bin`
            : 'firmware.bin';
          // fullPackageの場合はfirmware.binだけを取り出す
          const binary = compiledData instanceof Blob
            ? compiledData
            : (compiledData as FullPackage).firmware;
          compileService.downloadBinary(binary, filename);
        }
        break;
      }
      case 'download-uf2': {
        // .uf2ダウンロード: コンパイル→ダウンロード
        const compiledData = await executeCompile('uf2'); // UF2フォーマット指定
        if (compiledData) {
          const filename = currentProject?.title
            ? `${currentProject.title}.uf2`
            : 'firmware.uf2';
          // fullPackageの場合はfirmware.uf2だけを取り出す（通常UF2はfullPackageにならない）
          const binary = compiledData instanceof Blob
            ? compiledData
            : (compiledData as FullPackage).firmware;
          compileService.downloadBinary(binary, filename);
        }
        break;
      }
    }

    setCompiledBinary(null);
  };

  // 接続状態に応じた色（いずれかの接続方式が接続されていれば表示）
  const getConnectionStatusColor = () => {
    // 接続中のものがあればそれを優先
    if (serialStatus === 'connected' || wifiStatus === 'connected' || bluetoothStatus === 'connected') {
      return 'bg-green-500';
    }
    // 接続試行中
    if (serialStatus === 'connecting' || wifiStatus === 'connecting' || bluetoothStatus === 'connecting') {
      return 'bg-yellow-500 animate-pulse';
    }
    // エラー
    if (serialStatus === 'error' || wifiStatus === 'error' || bluetoothStatus === 'error') {
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

      {/* 言語選択 */}
      <div className={isMobile ? 'w-full' : 'flex items-center'}>
        <LanguageSelector />
      </div>

      {/* コンパイル＆書き込みボタン（Arduino C++のみ） */}
      {language === 'arduino' && (
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
      )}

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
      {/* コンパイル＆書き込みメニュー（Arduino C++のみ） */}
      {language === 'arduino' && (
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
      )}

      {/* 書込み先デバイス選択 */}
      <HeaderDeviceSelector />

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
          <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.menu.usbConnection')}</div>
          {serialStatus === 'connected' ? (
            <DropdownMenuItem onClick={() => disconnectSerial()}>
              <Usb className="w-4 h-4 mr-2" />
              {t('editor.menu.usbDisconnect')}
              <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => connectSerial()}>
              <Usb className="w-4 h-4 mr-2" />
              {t('editor.menu.usbConnect')}
              <div className="ml-auto w-2 h-2 rounded-full bg-gray-300" />
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.menu.bluetoothConnection')}</div>
          {bluetoothStatus === 'connected' ? (
            <DropdownMenuItem onClick={() => disconnectBluetooth()}>
              <Bluetooth className="w-4 h-4 mr-2" />
              {t('editor.menu.bluetoothDisconnect')}
              <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => connectBluetooth()}>
              <Bluetooth className="w-4 h-4 mr-2" />
              {t('editor.menu.bluetoothConnect')}
              <div className="ml-auto w-2 h-2 rounded-full bg-gray-300" />
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
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
          <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.language')}</div>
          <div className="px-2 pb-2">
            <LanguageSelector />
          </div>
          <DropdownMenuSeparator />
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
            {language === 'arduino' && (
              <TabsTrigger value="pid" className="text-xs px-2">
                <SlidersHorizontal className="w-3 h-3 mr-1" />
                {t('editor.bottom.pid')}
              </TabsTrigger>
            )}
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
              language={language === 'micropython' ? 'python' : 'cpp'}
              className="h-full"
            />
          )}
          {activeBottomTab === 'monitor' && (
            <SerialMonitor className="h-full" />
          )}
          {activeBottomTab === 'plotter' && (
            <SerialPlotter className="h-full" />
          )}
          {activeBottomTab === 'pid' && language === 'arduino' && (
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
        language={language}
        isCompiling={isCompiling}
        serverMode={serverMode}
        compileUsage={compileUsage}
        onCompile={handleCompile}
        onServerModeChange={setServerMode}
        deviceSelector={<HeaderDeviceSelector />}
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
            onProjectOpen={handleOpen}
            onFirmwareWrite={handleFirmwareWrite}
            onApSetup={() => setWifiSetupDialogOpen(true)}
            onBluetoothSetup={() => connectBluetooth()}
            onUsbPortRelease={() => setUsbPortReleaseDialogOpen(true)}
            onPinAssignment={() => setPinSettingsDialogOpen(true)}
            onCompileServerSettings={() => setCompileServerSettingsDialogOpen(true)}
            onDocs={() => window.open('/docs', '_blank')}
            onCodePreview={() => setCodePreviewDialogOpen(true)}
            onPidTuning={() => setPidTuningDialogOpen(true)}
            onUsbDriver={() => setUsbDriverDialogOpen(true)}
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
        <DialogContent className="sm:max-w-lg">
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

      {/* ファームウェア書き込み進捗ダイアログ */}
      <Dialog open={flashDialogOpen} onOpenChange={(open) => {
        setFlashDialogOpen(open);
        if (!open) {
          setIsWaitingForBootMode(false);
          setPendingFlashBinary(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isWaitingForBootMode ? '⚠️ 書き込み前の準備' : t('editor.flash.writingToEsp32')}
            </DialogTitle>
            <DialogDescription>
              {isWaitingForBootMode ? (
                'ESP32を書き込みモードにしてください'
              ) : (
                <>
                  {flashProgress.stage === 'connecting' && t('editor.connecting')}
                  {flashProgress.stage === 'erasing' && t('editor.erasingFlash')}
                  {flashProgress.stage === 'flashing' && t('editor.writing')}
                  {flashProgress.stage === 'verifying' && t('editor.writing')}
                  {flashProgress.stage === 'complete' && t('editor.complete')}
                  {flashProgress.stage === 'error' && t('editor.errorOccurred')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isWaitingForBootMode ? (
              /* BOOT操作手順を表示 */
              <>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 rounded-lg">
                  <h4 className="text-amber-900 dark:text-amber-200 font-semibold mb-3 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    ESP32を書き込みモードにする手順
                  </h4>
                  <ol className="text-sm text-gray-800 dark:text-gray-200 space-y-2 mb-3">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">1.</span>
                      <span><strong className="text-amber-600 dark:text-amber-400">BOOT</strong>ボタンを押し続ける</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">2.</span>
                      <span><strong className="text-amber-600 dark:text-amber-400">BOOT</strong>を押したまま、<strong className="text-amber-600 dark:text-amber-400">EN</strong>ボタンを一瞬押して離す</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">3.</span>
                      <span><strong className="text-amber-600 dark:text-amber-400">BOOT</strong>ボタンを離す</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">4.</span>
                      <span>この状態で下の「書き込み開始」ボタンを押す</span>
                    </li>
                  </ol>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    💡 ヒント: ボードによってはBOOTボタンが「IO0」「FLASH」「GPIO0」などと表記されている場合があります
                  </p>
                </div>
                <Button
                  onClick={executeFlash}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                >
                  ▶ 準備完了 - 書き込み開始
                </Button>
                <Button
                  onClick={() => setFlashDialogOpen(false)}
                  variant="outline"
                  className="w-full"
                >
                  キャンセル
                </Button>
              </>
            ) : (
              /* 書き込み進捗を表示 */
              <>
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
                {flashProgress.stage === 'error' && (
                  <Button
                    onClick={() => setFlashDialogOpen(false)}
                    className="w-full"
                    variant="destructive"
                  >
                    {t('common.close')}
                  </Button>
                )}
              </>
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
                  {/* USB書き込み */}
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

                      {/* .binファイルダウンロード */}
                      {supportedMethods.includes('download-bin') && (
                        <button
                          onClick={() => handleFlashMethodSelect('download-bin')}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 ${
                            getLastFlashMethod() === 'download-bin' ? 'border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                            <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">.binファイルをダウンロード</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">バイナリファイルをダウンロード</div>
                          </div>
                          {getLastFlashMethod() === 'download-bin' && (
                            <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{t('editor.flash.previous')}</span>
                          )}
                        </button>
                      )}

                      {/* .uf2ファイルダウンロード */}
                      {supportedMethods.includes('download-uf2') && (
                        <button
                          onClick={() => handleFlashMethodSelect('download-uf2')}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-green-50 dark:hover:bg-green-950 hover:border-green-300 dark:hover:border-green-700 ${
                            getLastFlashMethod() === 'download-uf2' ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                            <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">.uf2ファイルをダウンロード</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">RP2040用 (BOOTSEL モード)</div>
                          </div>
                          {getLastFlashMethod() === 'download-uf2' && (
                            <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">{t('editor.flash.previous')}</span>
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

      {/* Wifiルータに接続ダイアログ */}
      <WifiSetupDialog
        open={wifiSetupDialogOpen}
        onOpenChange={setWifiSetupDialogOpen}
      />

      {/* ファームウェアインストーラーダイアログ */}
      <FirmwareInstallerDialog
        open={firmwareInstallerDialogOpen}
        onOpenChange={setFirmwareInstallerDialogOpen}
      />

      {/* ピンアサイン設定ダイアログ */}
      <PinSettingsDialog
        open={pinSettingsDialogOpen}
        onOpenChange={setPinSettingsDialogOpen}
      />

      {/* コンパイルサーバー設定ダイアログ */}
      <CompileServerSettingsDialog
        open={compileServerSettingsDialogOpen}
        onOpenChange={setCompileServerSettingsDialogOpen}
      />

      {/* USBポート解放ダイアログ */}
      <UsbPortReleaseDialog
        open={usbPortReleaseDialogOpen}
        onOpenChange={setUsbPortReleaseDialogOpen}
      />

      {/* USBドライバーダイアログ */}
      <UsbDriverDialog
        open={usbDriverDialogOpen}
        onOpenChange={setUsbDriverDialogOpen}
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
              {language === 'micropython' ? 'MicroPython' : 'Arduino C++'} {t('editor.codePreview')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <CodePreview
              code={generatedCode}
              language={language === 'micropython' ? 'python' : 'cpp'}
              className="h-[60vh]"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* PIDチューニングダイアログ（Arduino C++のみ） */}
      {language === 'arduino' && (
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
      )}

      {/* チュートリアルオーバーレイ */}
      <TutorialOverlay />


      {/* ステータスバー */}
      <StatusBar
        state={statusBarState}
        message={statusBarMessage}
        binarySize={compiledBinary?.size}
        deviceInfo={{
          connected: wifiStatus === 'connected' || serialStatus === 'connected' || bluetoothStatus === 'connected',
          name: wifiStatus === 'connected' ? 'WiFi Device' : serialStatus === 'connected' ? 'USB Device' : bluetoothStatus === 'connected' ? 'BT Device' : undefined,
        }}
      />
    </div>
  );
}
