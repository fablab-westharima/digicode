import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FolderOpen,
  Zap,
  Wifi,
  BookOpen,
  Pin as PinIcon,
  Settings,
  Server,
  Upload,
  Radio,
  Code,
  SlidersHorizontal,
  Cpu
} from 'lucide-react';
import { Button } from '../ui/button';

interface SidebarProps {
  onProjectOpen?: () => void;
  onFirmwareWrite?: () => void;
  onOtaUpdate?: () => void;
  onWifiSetup?: () => void;
  onApSetup?: () => void;
  onBluetoothSetup?: () => void;
  onPinAssignment?: () => void;
  onCompileServerSettings?: () => void;
  onSettings?: () => void;
  onDocs?: () => void;
  onCodePreview?: () => void;
  onPidTuning?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function Sidebar({
  onProjectOpen,
  onFirmwareWrite,
  onOtaUpdate,
  onWifiSetup,
  onApSetup,
  onBluetoothSetup,
  onPinAssignment,
  onCompileServerSettings,
  onSettings,
  onDocs,
  onCodePreview,
  onPidTuning,
}: SidebarProps) {
  const { t } = useTranslation();
  const [isPinned, setIsPinned] = useState(false); // ピン留めなし
  const [isHovered, setIsHovered] = useState(false);

  const navItems: NavItem[] = [
    // Projects
    {
      id: 'projects',
      label: t('sidebar.projects', { defaultValue: 'プロジェクト' }),
      icon: <FolderOpen className="w-4 h-4" />,
      action: onProjectOpen || (() => {}),
      category: 'project'
    },
    // Firmware
    {
      id: 'firmware-write',
      label: t('sidebar.firmwareWrite', { defaultValue: 'ファームウェア書込み' }),
      icon: <Zap className="w-4 h-4" />,
      action: onFirmwareWrite || (() => {}),
      category: 'firmware'
    },
    {
      id: 'ota-update',
      label: t('sidebar.otaUpdate', { defaultValue: 'OTA更新' }),
      icon: <Upload className="w-4 h-4" />,
      action: onOtaUpdate || (() => {}),
      category: 'firmware'
    },
    // Device Setup
    {
      id: 'wifi-setup',
      label: t('sidebar.wifiSetup', { defaultValue: 'WiFi設定' }),
      icon: <Wifi className="w-4 h-4" />,
      action: onWifiSetup || (() => {}),
      category: 'device'
    },
    {
      id: 'ap-setup',
      label: t('sidebar.apSetup', { defaultValue: 'AP接続' }),
      icon: <Radio className="w-4 h-4" />,
      action: onApSetup || (() => {}),
      category: 'device'
    },
    {
      id: 'bluetooth-setup',
      label: t('sidebar.bluetoothSetup', { defaultValue: 'Bluetooth設定' }),
      icon: <Server className="w-4 h-4" />,
      action: onBluetoothSetup || (() => {}),
      category: 'device'
    },
    // Tools
    {
      id: 'pin-assignment',
      label: t('sidebar.pinAssignment', { defaultValue: 'ピン配置' }),
      icon: <PinIcon className="w-4 h-4" />,
      action: onPinAssignment || (() => {}),
      category: 'tools'
    },
    {
      id: 'code-preview',
      label: t('sidebar.codePreview', { defaultValue: '生成コード' }),
      icon: <Code className="w-4 h-4" />,
      action: onCodePreview || (() => {}),
      category: 'tools'
    },
    {
      id: 'pid-tuning',
      label: t('sidebar.pidTuning', { defaultValue: 'PIDチューニング' }),
      icon: <SlidersHorizontal className="w-4 h-4" />,
      action: onPidTuning || (() => {}),
      category: 'tools'
    },
    {
      id: 'compile-server',
      label: t('sidebar.compileServer', { defaultValue: 'コンパイルサーバー' }),
      icon: <Cpu className="w-4 h-4" />,
      action: onCompileServerSettings || (() => {}),
      category: 'tools'
    },
    // Documentation
    {
      id: 'docs',
      label: t('sidebar.documentation', { defaultValue: 'ドキュメント' }),
      icon: <BookOpen className="w-4 h-4" />,
      action: onDocs || (() => {}),
      category: 'docs'
    },
    // Settings
    {
      id: 'settings',
      label: t('sidebar.settings', { defaultValue: '設定' }),
      icon: <Settings className="w-4 h-4" />,
      action: onSettings || (() => {}),
      category: 'settings'
    },
  ];

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'project':
        return t('sidebar.category.project', { defaultValue: 'プロジェクト' });
      case 'firmware':
        return t('sidebar.category.firmware', { defaultValue: 'ファームウェア' });
      case 'device':
        return t('sidebar.category.device', { defaultValue: 'デバイス設定' });
      case 'tools':
        return t('sidebar.category.tools', { defaultValue: 'ツール' });
      case 'docs':
        return t('sidebar.category.docs', { defaultValue: 'ドキュメント' });
      case 'settings':
        return t('sidebar.category.settings', { defaultValue: '設定' });
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
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="mb-4">
            {shouldShowFull && (
              <div className="px-4 py-2 text-xs font-semibold text-[#8B949E] uppercase tracking-wide">
                {getCategoryLabel(category)}
              </div>
            )}
            <div className="space-y-1 px-2">
              {items.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start text-[#E6EDF3] hover:bg-[#2E333D] hover:text-white ${
                    shouldShowFull ? 'px-3' : 'px-0 justify-center'
                  }`}
                  onClick={item.action}
                  title={!shouldShowFull ? item.label : undefined}
                >
                  <span className={shouldShowFull ? 'mr-3' : ''}>{item.icon}</span>
                  {shouldShowFull && <span className="text-sm">{item.label}</span>}
                </Button>
              ))}
            </div>
          </div>
        ))}
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
