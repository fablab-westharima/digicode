import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Download,
  LogIn
} from 'lucide-react';
import { Button } from '../ui/button';

interface SidebarProps {
  isAuthenticated?: boolean;
  onProjectOpen?: () => void;
  onBleFirmwareWrite?: () => void;
  onWifiPrerequisites?: () => void;
  onWifiFirmwareWrite?: () => void;
  onApSetup?: () => void;
  onUsbPortRelease?: () => void;
  onServoTrim?: () => void;
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
  premium?: boolean; // 有料機能フラグ（未ログイン時グレーアウト）
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
}: SidebarProps) {
  const { t } = useTranslation();
  const [isPinned, setIsPinned] = useState(false); // ピン留めなし
  const [isHovered, setIsHovered] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['project'])); // デフォルトでprojectを開く
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set()); // サブメニュー展開状態

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
      premium: true,
    },
    {
      id: 'pid-tuning',
      label: t('sidebar.pidTuning', { defaultValue: 'PIDチューニング' }),
      icon: <SlidersHorizontal className="w-4 h-4" />,
      action: onPidTuning || (() => {}),
      category: 'tuning',
      premium: true,
    },
    // 詳細設定（上級者・開発者向け）
    {
      id: 'code-preview',
      label: t('sidebar.codePreview', { defaultValue: '生成コード' }),
      icon: <Code className="w-4 h-4" />,
      action: onCodePreview || (() => {}),
      category: 'advanced'
    },
    {
      id: 'compile-server',
      label: t('sidebar.compileServerSelect', { defaultValue: 'コンパイルサーバ設定' }),
      icon: <Cpu className="w-4 h-4" />,
      action: onCompileServerSettings || (() => {}),
      category: 'advanced'
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
    // ヘルプ
    {
      id: 'docs',
      label: t('sidebar.documentation', { defaultValue: 'ドキュメント' }),
      icon: <BookOpen className="w-4 h-4" />,
      action: onDocs || (() => {}),
      category: 'help'
    },
    // アカウント（認証状態で表示を切り替え）
    ...(isAuthenticated ? [
      {
        id: 'passkey-register',
        label: t('sidebar.passkeyRegister', { defaultValue: 'パスキーを登録' }),
        icon: <Key className="w-4 h-4" />,
        action: onPasskeyRegister || (() => {}),
        category: 'account'
      },
      {
        id: 'two-factor-settings',
        label: t('sidebar.twoFactorSettings', { defaultValue: '2段階認証' }),
        icon: <Shield className="w-4 h-4" />,
        action: onTwoFactorSettings || (() => {}),
        category: 'account'
      },
      {
        id: 'account-delete',
        label: t('sidebar.accountDelete', { defaultValue: 'アカウント削除' }),
        icon: <UserX className="w-4 h-4" />,
        action: onAccountDelete || (() => {}),
        category: 'account'
      },
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
  const categoryOrder = ['project', 'otaSetup', 'usbDriver', 'tuning', 'advanced', 'help', 'account'];
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
            title={isPinned ? 'ピン留め解除' : 'ピン留め'}
          >
            <PinIcon className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
          </Button>
        )}
        {!shouldShowFull && <div />}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-2">
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
                      // 通常のアイテム（premiumかつ未ログインならグレーアウト）
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${
                          item.premium && !isAuthenticated
                            ? 'text-[#484F58] cursor-not-allowed'
                            : 'text-[#E6EDF3] hover:bg-[#2E333D] hover:text-white'
                        } ${shouldShowFull ? 'px-3' : 'px-0 justify-center'}`}
                        onClick={item.premium && !isAuthenticated ? undefined : item.action}
                        disabled={item.premium && !isAuthenticated}
                        title={!shouldShowFull ? item.label : item.premium && !isAuthenticated ? 'ログインが必要です' : undefined}
                      >
                        <span className={shouldShowFull ? 'mr-3' : ''}>{item.icon}</span>
                        {shouldShowFull && (
                          <span className="text-sm flex-1 text-left">{item.label}</span>
                        )}
                        {shouldShowFull && item.premium && !isAuthenticated && (
                          <span className="text-[10px] text-[#484F58] ml-1">PRO</span>
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

      {/* Footer - Collapse hint */}
      {shouldShowFull && (
        <div className="px-4 py-3 border-t border-[#2E333D]">
          <div className="text-xs text-[#8B949E]">
            {t('sidebar.hint', { defaultValue: 'サイドバーを折りたたむには左矢印をクリック' })}
          </div>
        </div>
      )}
    </div>
  );
}
