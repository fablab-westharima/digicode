import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AIAssistantPanel } from './AIAssistantPanel';
import { AIAssistantDialog } from './AIAssistantDialog';
import {
  FolderOpen,
  Zap,
  BookOpen,
  Pin as PinIcon,
  Radio,
  Code,
  SlidersHorizontal,
  Cpu,
  Trash2,
  Usb,
  LogOut,
  Key,
  UserX,
  Shield,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  Bluetooth,
  Wifi,
  Download,
  LogIn,
  Settings,
  Users,
  Lock,
  ClipboardList,
  Save,
  Award,
  CreditCard,
  Bot,
  Megaphone
} from 'lucide-react';
import { Button } from '../ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useClassServerHealthStore } from '@/stores/classServerHealthStore';

interface SidebarProps {
  isAuthenticated?: boolean;
  onProjectOpen?: () => void;
  onBleFirmwareWrite?: () => void;
  onWifiPrerequisites?: () => void;
  onWifiFirmwareWrite?: () => void;
  onApSetup?: () => void;
  onUsbPortRelease?: () => void;
  onServoTrim?: () => void;
  onServoPulse?: () => void;
  onPinAssignment?: () => void;
  onCompileServerSettings?: () => void;
  onDocs?: () => void;
  onCodePreview?: () => void;
  onPidTuning?: () => void;
  onUsbDriver?: () => void;
  onDeviceName?: () => void;
  onLogin?: () => void;
  onLogout?: () => void;
  onPasskeyRegister?: () => void;
  onTwoFactorSettings?: () => void;
  onAccountDelete?: () => void;
  onChangePassword?: () => void;
  onSubmissionList?: () => void;
  onSubmissionSaveDialog?: () => void;
  onGradedList?: () => void;
  currentSubmissionTitle?: string | null;
  onAiAppendBlocks?: (xml: string) => void;
  onAiClearWorkspace?: () => void;
  workspaceXml?: string;
  onOpenAiSettings?: () => void;
  onShowBleController?: () => void;
  onShowWifiController?: () => void;
  // 第102回 C3: ヘッダー Feedback button と state 共有、EditorPage が mount を保持
  onOpenFeedback?: () => void;
}

interface NavSubItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action?: () => void;
  href?: string; // 外部リンク用
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action?: () => void;
  category: string;
  children?: NavSubItem[]; // サブメニュー用
  premium?: boolean; // Enterprise 限定機能フラグ (第107回 Task 2 で narrow、ENT バッジ表示)
  proGate?: boolean; // Pro/Enterprise 限定機能フラグ (第107回 Task 2、PRO バッジ表示)
  disabled?: boolean; // 一時的な非活性 (例: 連携サーバーダウン中)
  disabledLabel?: string; // disabled 時に表示する補助ラベル (赤文字 inline)
  beta?: boolean; // ベータ機能（β バッジ常時表示）
}

export function Sidebar({
  isAuthenticated = false,
  onProjectOpen,
  onBleFirmwareWrite,
  onWifiPrerequisites,
  onWifiFirmwareWrite,
  onApSetup,
  onUsbPortRelease,
  onServoTrim,
  onServoPulse,
  onPinAssignment,
  onCompileServerSettings,
  onDocs,
  onCodePreview,
  onPidTuning,
  onUsbDriver,
  onDeviceName,
  onLogin,
  onLogout,
  onPasskeyRegister,
  onTwoFactorSettings,
  onAccountDelete,
  onChangePassword,
  onSubmissionList,
  onSubmissionSaveDialog,
  onGradedList,
  currentSubmissionTitle,
  onAiAppendBlocks,
  onAiClearWorkspace,
  workspaceXml,
  onOpenAiSettings,
  onShowBleController,
  onShowWifiController,
  onOpenFeedback,
}: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { canUsePinAssign, canUseServoPulse, isFreeOpenNow, fetchFlags, canUseAiBlockGeneration, canUseAiHelpBot, canSubmitFeedback } = useFeatureFlagStore();
  // class-server (ML30) のヘルスチェック state を slice value で subscribe
  // (`memory:zustand_state_reading_selector` 厳守、function ref ではなく値直接 select)。
  const isClassServerDown = useClassServerHealthStore((s) => s.status === 'down');
  const [isPinned, setIsPinned] = useState(true); // デフォルトでピン留め
  const [isHovered, setIsHovered] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['project'])); // デフォルトでprojectを開く
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set()); // サブメニュー展開状態
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  // Feature Flagsを取得
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isPinAssignAvailable = canUsePinAssign(user?.plan);
  const isServoPulseAvailable = canUseServoPulse(user?.plan);
  const isPinAssignFreeOpen = isFreeOpenNow('pin_assign_pro');
  const isAiAvailable = canUseAiBlockGeneration(user?.plan, user?.accountType);
  const isHelpBotAvailable = canUseAiHelpBot(user?.plan, user?.accountType);
  const isAiUpgradeCandidate = isAuthenticated && user?.accountType !== 'student' && !isAiAvailable;
  // 第103回: プレリリース期間中 (pin_assign_pro.isFreeNow=true) は全 user に開放、
  // 通常時は canSubmitFeedback (lite/pro/enterprise non-student) のみ
  const isFeedbackAvailable =
    canSubmitFeedback(user?.plan, user?.accountType) || isFreeOpenNow('pin_assign_pro');

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const navItems: NavItem[] = [
    // プロジェクト
    {
      id: 'projects',
      label: t('sidebar.projects', { defaultValue: 'プロジェクト' }),
      icon: <FolderOpen className="w-4 h-4" />,
      action: onProjectOpen || (() => {}),
      category: 'project'
    },
    // OTAセットアップ - BLE OTA
    {
      id: 'ble-ota',
      label: t('sidebar.bleOta', { defaultValue: 'BLE OTA' }),
      icon: <Bluetooth className="w-4 h-4" />,
      category: 'otaSetup',
      children: [
        {
          id: 'ble-firmware-write',
          label: t('sidebar.bleFirmwareWrite', { defaultValue: 'BLEファームウェア書き込み' }),
          icon: <Zap className="w-3 h-3" />,
          action: onBleFirmwareWrite || (() => {}),
        },
        {
          id: 'ble-device-name',
          label: t('sidebar.bleDeviceName', { defaultValue: 'BLEデバイス名設定' }),
          icon: <Pencil className="w-3 h-3" />,
          action: onDeviceName || (() => {}),
        },
      ],
    },
    // OTAセットアップ - WiFi OTA
    {
      id: 'wifi-ota',
      label: t('sidebar.wifiOta', { defaultValue: 'WiFi OTA' }),
      icon: <Radio className="w-4 h-4" />,
      category: 'otaSetup',
      children: [
        {
          id: 'wifi-prerequisites',
          label: t('sidebar.wifiPrerequisites', { defaultValue: '必要ソフトの準備' }),
          icon: <Download className="w-3 h-3" />,
          action: onWifiPrerequisites || (() => {}),
        },
        {
          id: 'wifi-firmware-write',
          label: t('sidebar.wifiFirmwareWrite', { defaultValue: 'WiFiファームウェア書き込み' }),
          icon: <Zap className="w-3 h-3" />,
          action: onWifiFirmwareWrite || (() => {}),
        },
        {
          id: 'wifi-ap-setup',
          label: t('sidebar.apSetup', { defaultValue: 'アクセスポイント接続' }),
          icon: <Radio className="w-3 h-3" />,
          action: onApSetup || (() => {}),
        },
        {
          id: 'wifi-device-name',
          label: t('sidebar.wifiDeviceName', { defaultValue: 'WiFiデバイス名変更' }),
          icon: <Pencil className="w-3 h-3" />,
          action: onDeviceName || (() => {}),
        },
      ],
    },
    // Session 98 Task 4-side: 旧「HA OTA → .bin ダウンロード」menu は
    // コンパイル＆書き込みダイアログの「ファームウェア書出し (.bin)」section に
    // 統合して削除。元意図 = 書込み方法選択ダイアログ内に統合。
    // USBドライバー（独立カテゴリ）
    {
      id: 'usb-driver-cp210x',
      label: 'CP210x (Silicon Labs)',
      icon: <ExternalLink className="w-4 h-4" />,
      category: 'usbDriver',
      action: () => window.open('https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers?tab=downloads', '_blank'),
    },
    {
      id: 'usb-driver-ch340',
      label: 'CH340 (WCH)',
      icon: <ExternalLink className="w-4 h-4" />,
      category: 'usbDriver',
      action: () => window.open('https://www.wch-ic.com/downloads/CH341SER_EXE.html', '_blank'),
    },
    {
      id: 'usb-driver-all',
      label: t('sidebar.usbDriverAll', { defaultValue: 'すべてのドライバー' }),
      icon: <Usb className="w-4 h-4" />,
      action: onUsbDriver || (() => {}),
      category: 'usbDriver',
    },
    // 調整（動作調整系）
    {
      id: 'servo-trim',
      label: t('sidebar.servoTrim', { defaultValue: 'サーボトリム設定' }),
      icon: <SlidersHorizontal className="w-4 h-4" />,
      action: onServoTrim || (() => {}),
      category: 'tuning',
    },
    // 第107回 Task 1: サーボパルス調整 (ピンアサインから独立、ロボット製作者向け)
    // Task 2: Pro/Enterprise 限定 (proGate)、プレリリース中は全 user 開放
    {
      id: 'servo-pulse',
      label: t('sidebar.servoPulse', { defaultValue: 'サーボパルス調整' }),
      icon: <SlidersHorizontal className="w-4 h-4" />,
      action: onServoPulse || (() => {}),
      category: 'tuning',
      proGate: true,
    },
    {
      id: 'pid-tuning',
      label: t('sidebar.pidTuning', { defaultValue: 'PIDチューニング' }),
      icon: <SlidersHorizontal className="w-4 h-4" />,
      action: onPidTuning || (() => {}),
      category: 'tuning',
    },
    // 詳細設定（上級者・開発者向け）
    {
      id: 'code-preview',
      label: t('sidebar.codePreview', { defaultValue: '生成コード' }),
      icon: <Code className="w-4 h-4" />,
      action: onCodePreview || (() => {}),
      category: 'advanced'
    },
    // コンパイル設定（2026-04-11復活: ghcr.ioでDocker配布再開、未ログイン時はクラウド選択不可）
    {
      id: 'compile-server',
      label: t('sidebar.compileSettings', { defaultValue: 'コンパイル設定' }),
      icon: <Cpu className="w-4 h-4" />,
      action: onCompileServerSettings || (() => {}),
      category: 'advanced' as const,
    },
    {
      id: 'usb-port-release',
      label: t('sidebar.usbPortRelease', { defaultValue: 'USBポート解放' }),
      icon: <Trash2 className="w-4 h-4" />,
      action: onUsbPortRelease || (() => {}),
      category: 'advanced'
    },
    {
      id: 'pin-assignment',
      label: t('sidebar.extensions', { defaultValue: '拡張機能' }),
      icon: <PinIcon className="w-4 h-4" />,
      action: onPinAssignment || (() => {}),
      category: 'advanced',
      premium: true,
    },
    // BLE / WiFi コントローラ (47.md Phase 2 commit #5、LinearToolbar peer pair の Sidebar 展開)
    {
      id: 'ble-controller',
      label: t('sidebar.bleController', { defaultValue: 'BLE UI 生成' }),
      icon: <Bluetooth className="w-4 h-4" />,
      action: onShowBleController || (() => {}),
      category: 'advanced',
    },
    {
      id: 'wifi-controller',
      label: t('sidebar.wifiController', { defaultValue: 'WiFi UI 生成' }),
      icon: <Wifi className="w-4 h-4" />,
      action: onShowWifiController || (() => {}),
      category: 'advanced',
    },
    // 課題（生徒のみ）
    ...(user?.accountType === 'student' ? [
      {
        id: 'submission-list',
        label: t('sidebar.submissionList', { defaultValue: '課題一覧' }),
        icon: <ClipboardList className="w-4 h-4" />,
        action: onSubmissionList || (() => {}),
        category: 'assignment' as const,
      },
      {
        id: 'submission-save-dialog',
        label: currentSubmissionTitle
          ? t('sidebar.submissionSaveWithTitle', { title: currentSubmissionTitle, defaultValue: '保存と提出 — {{title}}' })
          : t('sidebar.submissionSave', { defaultValue: '保存と提出' }),
        icon: <Save className="w-4 h-4" />,
        action: onSubmissionSaveDialog || (() => {}),
        category: 'assignment' as const,
      },
      {
        id: 'graded-list',
        label: t('sidebar.gradedList', { defaultValue: '採点結果' }),
        icon: <Award className="w-4 h-4" />,
        action: onGradedList || (() => {}),
        category: 'assignment' as const,
      },
    ] : []),
    // ヘルプ
    {
      id: 'docs',
      label: t('sidebar.documentation', { defaultValue: 'ドキュメント' }),
      icon: <BookOpen className="w-4 h-4" />,
      action: onDocs || (() => {}),
      category: 'help'
    },
    // 要望を送る（課金ユーザーのみ、ヘルプ category 内）
    ...(isFeedbackAvailable && onOpenFeedback ? [{
      id: 'feedback',
      label: t('feedback.button.label', { defaultValue: '要望を送る' }),
      icon: <Megaphone className="w-4 h-4" />,
      action: onOpenFeedback,
      category: 'help' as const,
    }] : []),
    // アカウント（認証状態・アカウント種別で表示を切り替え）
    ...(isAuthenticated ? [
      ...(user?.accountType !== 'student' ? [{
        id: 'plan',
        label: t('sidebar.plan', { defaultValue: 'プラン・お支払い' }),
        icon: <CreditCard className="w-4 h-4" />,
        action: () => navigate('/plan'),
        category: 'account' as const,
      }] : []),
      ...(user?.isAdmin ? [{
        id: 'admin',
        label: t('sidebar.admin', { defaultValue: '管理画面' }),
        icon: <Settings className="w-4 h-4" />,
        action: () => navigate('/admin'),
        category: 'account' as const,
      }] : []),
      // 第103回 hotfix2: プレリリース期間中 (pin_assign_pro.isFreeNow=true) は
      // 認証 user (plan 不問) にもクラス管理 menu を表示。anonymous は user 自体が
      // 不在なため対象外 (class owner_id が必要)。
      // 第105回 Task 2: class-server ダウン時は赤文字「サーバーダウン中」表示 + click 不能化。
      ...((user && (user.plan === 'enterprise' || isPinAssignFreeOpen)) ? [{
        id: 'class-management',
        label: t('sidebar.classManagement', { defaultValue: 'クラス管理' }),
        icon: <Users className="w-4 h-4" />,
        action: () => navigate('/classes'),
        category: 'account' as const,
        disabled: isClassServerDown,
        disabledLabel: isClassServerDown
          ? t('sidebar.classServerDown', { defaultValue: 'サーバーダウン中' })
          : undefined,
        beta: true,
      }] : []),
      // 生徒アカウント: パスワード変更のみ表示
      // 通常アカウント: パスキー登録・2段階認証・アカウント削除を表示
      ...(user?.accountType !== 'student' ? [
        {
          id: 'passkey-register',
          label: t('sidebar.passkeyRegister', { defaultValue: 'パスキーを登録' }),
          icon: <Key className="w-4 h-4" />,
          action: onPasskeyRegister || (() => {}),
          category: 'account' as const,
        },
        {
          id: 'two-factor-settings',
          label: t('sidebar.twoFactorSettings', { defaultValue: '2段階認証' }),
          icon: <Shield className="w-4 h-4" />,
          action: onTwoFactorSettings || (() => {}),
          category: 'account' as const,
        },
        {
          id: 'account-delete',
          label: t('sidebar.accountDelete', { defaultValue: 'アカウント削除' }),
          icon: <UserX className="w-4 h-4" />,
          action: onAccountDelete || (() => {}),
          category: 'account' as const,
        },
      ] : []),
      {
        id: 'change-password',
        label: t('sidebar.changePassword', { defaultValue: 'パスワード変更' }),
        icon: <Lock className="w-4 h-4" />,
        action: onChangePassword || (() => {}),
        category: 'account' as const,
      },
      // AI 設定: AI パネルが表示されるユーザーのみ（Lite+ または upgrade 候補）
      ...((isAiAvailable || isAiUpgradeCandidate) ? [{
        id: 'ai-settings',
        label: t('sidebar.aiSettings', { defaultValue: 'AI 設定' }),
        icon: <Bot className="w-4 h-4" />,
        action: onOpenAiSettings || (() => {}),
        category: 'account' as const,
      }] : []),
      {
        id: 'logout',
        label: t('sidebar.logout', { defaultValue: 'ログアウト' }),
        icon: <LogOut className="w-4 h-4" />,
        action: onLogout || (() => {}),
        category: 'account'
      },
    ] : [
      {
        id: 'login',
        label: t('sidebar.login', { defaultValue: 'ログイン / 新規登録' }),
        icon: <LogIn className="w-4 h-4" />,
        action: onLogin || (() => {}),
        category: 'account'
      },
    ]),
  ];

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'project':
        return t('sidebar.category.project', { defaultValue: 'プロジェクト' });
      case 'otaSetup':
        return t('sidebar.category.otaSetup', { defaultValue: 'OTAセットアップ' });
      case 'usbDriver':
        return t('sidebar.category.usbDriver', { defaultValue: 'USBドライバー' });
      case 'tuning':
        return t('sidebar.category.tuning', { defaultValue: '調整' });
      case 'advanced':
        return t('sidebar.category.advanced', { defaultValue: '詳細設定' });
      case 'assignment':
        return t('sidebar.category.assignment', { defaultValue: '課題' });
      case 'help':
        return t('sidebar.category.help', { defaultValue: 'ヘルプ' });
      case 'account':
        return t('sidebar.category.account', { defaultValue: 'アカウント' });
      default:
        return category;
    }
  };

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // カテゴリの表示順序を定義
  const categoryOrder = ['account', 'project', 'assignment', 'otaSetup', 'usbDriver', 'tuning', 'advanced', 'help'];
  const orderedCategories = categoryOrder.filter(cat => groupedItems[cat]);

  // 表示状態を計算
  const shouldShowFull = isPinned || isHovered;

  return (
    <div
      className={`flex flex-col bg-[#1C1F26] border-r border-[#2E333D] transition-all duration-300 ${
        shouldShowFull ? 'w-64' : 'w-16'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ピン留めボタン */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-[#2E333D]">
        {shouldShowFull && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPinned(!isPinned)}
            className={`text-[#E6EDF3] hover:bg-[#2E333D] p-1 ${isPinned ? 'text-blue-400' : ''}`}
            title={isPinned ? t('sidebar.unpin', { defaultValue: 'ピン留め解除' }) : t('sidebar.pin', { defaultValue: 'ピン留め' })}
          >
            <PinIcon className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
          </Button>
        )}
        {!shouldShowFull && <div />}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-2 min-h-[30vh] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#3E4451] [&::-webkit-scrollbar-thumb:hover]:bg-[#5C6370]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3E4451 transparent' }}>
        {orderedCategories.map((category) => {
          const items = groupedItems[category];
          const isExpanded = expandedCategories.has(category);
          return (
            <div key={category} className="mb-1">
              {shouldShowFull ? (
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-[#8B949E] uppercase tracking-wide hover:bg-[#2E333D] hover:text-[#E6EDF3] transition-colors"
                >
                  <span>{getCategoryLabel(category)}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div className="h-px bg-[#2E333D] mx-2 my-2" />
              )}
              <div
                className={`space-y-1 px-2 overflow-hidden transition-all duration-200 ${
                  shouldShowFull
                    ? isExpanded
                      ? 'max-h-[500px] opacity-100'
                      : 'max-h-0 opacity-0'
                    : 'max-h-[500px] opacity-100'
                }`}
              >
                {items.map((item) => (
                  <div key={item.id}>
                    {item.children ? (
                      // サブメニューを持つアイテム
                      <>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start text-[#E6EDF3] hover:bg-[#2E333D] hover:text-white ${
                            shouldShowFull ? 'px-3' : 'px-0 justify-center'
                          }`}
                          onClick={() => toggleItem(item.id)}
                          title={!shouldShowFull ? item.label : undefined}
                        >
                          <span className={shouldShowFull ? 'mr-3' : ''}>{item.icon}</span>
                          {shouldShowFull && (
                            <>
                              <span className="text-sm flex-1 text-left">{item.label}</span>
                              {expandedItems.has(item.id) ? (
                                <ChevronDown className="w-3 h-3 ml-1" />
                              ) : (
                                <ChevronRight className="w-3 h-3 ml-1" />
                              )}
                            </>
                          )}
                        </Button>
                        {/* サブメニュー */}
                        {shouldShowFull && (
                          <div
                            className={`ml-4 space-y-1 overflow-hidden transition-all duration-200 ${
                              expandedItems.has(item.id)
                                ? 'max-h-48 opacity-100 mt-1'
                                : 'max-h-0 opacity-0'
                            }`}
                          >
                            {item.children.map((child) => (
                              child.href ? (
                                <a
                                  key={child.id}
                                  href={child.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D] rounded-md transition-colors"
                                >
                                  {child.icon}
                                  <span>{child.label}</span>
                                </a>
                              ) : (
                                <Button
                                  key={child.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D] px-3"
                                  onClick={child.action}
                                >
                                  {child.icon && <span className="mr-2">{child.icon}</span>}
                                  <span className="text-sm">{child.label}</span>
                                </Button>
                              )
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      // 通常のアイテム (gate / disabled 状態に応じて lock 表示)
                      // 第107回 Task 2: premium = Enterprise 限定 (ENT badge) / proGate = Pro+ 限定 (PRO badge)
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${
                          (item.premium && !isPinAssignAvailable) || (item.proGate && !isServoPulseAvailable) || item.disabled
                            ? 'text-[#E6EDF3] hover:bg-[#2E333D] hover:text-white cursor-not-allowed'
                            : 'text-[#E6EDF3] hover:bg-[#2E333D] hover:text-white'
                        } ${shouldShowFull ? 'px-3' : 'px-0 justify-center'}`}
                        onClick={(item.premium && !isPinAssignAvailable) || (item.proGate && !isServoPulseAvailable) || item.disabled ? undefined : item.action}
                        title={
                          !shouldShowFull
                            ? item.label
                            : item.disabled
                              ? item.disabledLabel
                              : item.premium && !isPinAssignAvailable
                                ? t('sidebar.requiresEnterprise', { defaultValue: 'Enterprise プランで利用可能です' })
                                : item.proGate && !isServoPulseAvailable
                                  ? t('sidebar.requiresPro', { defaultValue: 'Pro プラン以上で利用可能です' })
                                  : undefined
                        }
                      >
                        <span className={shouldShowFull ? 'mr-3' : ''}>{item.icon}</span>
                        {shouldShowFull && (
                          <span className="text-sm flex-1 text-left">{item.label}</span>
                        )}
                        {shouldShowFull && item.disabled && item.disabledLabel && (
                          <span className="text-[10px] text-red-400 ml-1">{item.disabledLabel}</span>
                        )}
                        {shouldShowFull && !item.disabled && item.beta && (
                          <span className="text-[10px] text-amber-400 ml-1">β</span>
                        )}
                        {shouldShowFull && !item.disabled && item.premium && !isPinAssignAvailable && (
                          <span className="text-[10px] text-purple-400 ml-1">ENT</span>
                        )}
                        {shouldShowFull && !item.disabled && item.proGate && !isServoPulseAvailable && (
                          <span className="text-[10px] text-orange-400 ml-1">PRO</span>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Assistant Panel: Lite+ ユーザー / upgrade 候補ユーザー / プレリリース期間中の全 user。
          第103回 hotfix3: 旧 `isAuthenticated &&` gate を撤去 — `isAiAvailable` は
          featureFlagStore で flag.isFreeNow OR layer 適用済 (hotfix2)、`isAiUpgradeCandidate`
          は L150 定義に `isAuthenticated &&` 内包のため、auth user のみ upgrade CTA は維持される。
          unauth user で flag.isFreeNow=false なら両方 false で従来通り非表示。 */}
      {(isAiAvailable || isAiUpgradeCandidate) && (
        <div className={`${shouldShowFull ? 'flex-1 min-h-[40vh]' : ''} overflow-y-auto border-t border-[#2E333D]`}>
          <AIAssistantPanel
            onAppendBlocks={onAiAppendBlocks}
            onClearWorkspace={onAiClearWorkspace}
            workspaceXml={workspaceXml}
            shouldShowFull={shouldShowFull}
            onUpgradePlan={() => navigate('/plan')}
            isAvailable={isAiAvailable}
            isHelpBotAvailable={isHelpBotAvailable}
            onExpand={() => setIsAiDialogOpen(true)}
          />
        </div>
      )}

      {/* AI アシスタント 展開ダイアログ */}
      <AIAssistantDialog
        open={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        onAppendBlocks={onAiAppendBlocks}
        onClearWorkspace={onAiClearWorkspace}
        workspaceXml={workspaceXml}
        isAvailable={isAiAvailable}
        isHelpBotAvailable={isHelpBotAvailable}
        onUpgradePlan={() => navigate('/plan')}
      />

      {/* 要望フォーム ダイアログは EditorPage 側に移譲 (第102回 C3 state lift)。 */}
    </div>
  );
}
