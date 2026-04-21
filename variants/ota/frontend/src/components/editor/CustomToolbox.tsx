import { useState, useEffect } from 'react';
import * as Blockly from 'blockly';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// カテゴリの型定義
interface ToolboxCategory {
  name: string;
  colour: string;
  icon?: string;
  blocks?: string[];
  categories?: ToolboxCategory[];
  custom?: string;
}

interface CustomToolboxProps {
  workspace: Blockly.WorkspaceSvg | null;
  categories: ToolboxCategory[];
}

// カテゴリ名から絵文字を抽出するヘルパー関数
const extractEmojiAndName = (name: string): { emoji: string | null; displayName: string } => {
  // 絵文字を検出する正規表現（拡張パターン）
  // U+3030: 〰️ 波線
  // U+23E0-U+23FF: ⏱️などの時計系絵文字
  // U+2600-U+26FF: ⚙️などの記号
  // U+2700-U+27BF: ✂️などの記号
  // U+1F300-U+1F9FF: 大部分の絵文字
  const emojiRegex = /^([\u{3030}]|[\u{23E0}-\u{23FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}])[\uFE0F]?\s*/u;
  const match = name.match(emojiRegex);

  if (match) {
    return {
      emoji: match[1],
      displayName: name.replace(emojiRegex, '').trim()
    };
  }

  return {
    emoji: null,
    displayName: name
  };
};

// フォールバック用のアイコンマッピング（絵文字がない場合のみ使用）
// キーは Blockly ツールボックスの category id（言語非依存）。
// 旧: 日本語 displayName で引いていたが、多言語化で破綻するため id ベースに変更（2026-04-19、ルール33）。
// 参考: toolboxGenerator.ts の <category id="..." ...>
const fallbackIcons: Record<string, string> = {
  logic: '🧠',
  loops: '🔄',
  math: '🔢',
  variables: '📦',
  functions: '⚙️',
};

// カテゴリの色（キーは id、言語非依存）
const categoryColors: Record<string, string> = {
  robotHumanoid: '#FF6B6B',
  ultrasonicSensor: '#F59E0B',
  buzzer: '#6B7280',
  neopixel: '#EC4899',
  serial: '#14B8A6',
  time: '#06B6D4',
  logic: '#6366F1',
  loops: '#22C55E',
  math: '#3B82F6',
  variables: '#F97316',
  functions: '#8B5CF6',
  servo: '#EF4444',
  motor: '#10B981',
  stepper: '#6366F1',
  display: '#8B5CF6',
  lineSensor: '#F59E0B',
  encoder: '#06B6D4',
  wallSensor: '#EF4444',
  pidControl: '#3B82F6',
  qtrSensor: '#22C55E',
  diffDrive: '#F97316',
};

export function CustomToolbox({ workspace, categories }: CustomToolboxProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // カテゴリクリック時にフライアウトを表示
  const handleCategoryClick = (category: ToolboxCategory) => {
    if (!workspace) return;

    // サブカテゴリがある場合は展開/折りたたみ
    if (category.categories && category.categories.length > 0) {
      setExpandedCategories(prev => {
        const next = new Set(prev);
        if (next.has(category.name)) {
          next.delete(category.name);
        } else {
          next.add(category.name);
        }
        return next;
      });
      return;
    }

    setSelectedCategory(category.name);

    // ツールボックスのカテゴリを検索してフライアウトを表示
    const toolbox = workspace.getToolbox();
    if (toolbox) {
      const toolboxItems = (toolbox as any).getToolboxItems();
      const findCategory = (items: any[], name: string): Blockly.ISelectableToolboxItem | null => {
        for (const item of items) {
          if ('getName' in item && (item as Blockly.ToolboxCategory).getName() === name) {
            return item as Blockly.ISelectableToolboxItem;
          }
          if ('getChildToolboxItems' in item) {
            const children = (item as any).getChildToolboxItems();
            const found = findCategory(children, name);
            if (found) return found;
          }
        }
        return null;
      };

      const targetCategory = findCategory(toolboxItems, category.name);
      if (targetCategory) {
        // フライアウトを一度閉じてから再度開く
        toolbox.clearSelection();
        // 少し遅延させてから選択（Blocklyの内部状態更新を待つ）
        setTimeout(() => {
          (toolbox as any).setSelectedItem(targetCategory);
        }, 10);
      }
    }
  };

  // ワークスペース変更時にフライアウトを閉じる
  useEffect(() => {
    if (!workspace) return;

    const handleWorkspaceClick = () => {
      // ワークスペースをクリックした時はカテゴリ選択を解除しない
      // フライアウトは自動的に閉じる
    };

    workspace.addChangeListener(handleWorkspaceClick);
    return () => workspace.removeChangeListener(handleWorkspaceClick);
  }, [workspace]);

  const renderCategory = (category: ToolboxCategory, depth: number = 0) => {
    const hasChildren = category.categories && category.categories.length > 0;
    const isExpanded = expandedCategories.has(category.name);
    const isSelected = selectedCategory === category.name;

    // カテゴリ名から絵文字を抽出
    const { emoji, displayName } = extractEmojiAndName(category.name);
    // 辞書キーは category.id（言語非依存）優先、fallback で displayName（後方互換）
    const lookupKey = category.id || displayName;
    // 絵文字がなければフォールバックアイコンを使用
    const icon = emoji || fallbackIcons[lookupKey] || '📦';
    // 色の取得
    const color = categoryColors[lookupKey] || category.colour || '#6366F1';

    return (
      <div key={category.name}>
        <button
          onClick={() => handleCategoryClick(category)}
          className={`
            w-full flex items-center gap-3 px-3 py-3 text-left
            transition-all duration-150 ease-in-out
            hover:bg-gray-100 group relative
            ${isSelected ? 'bg-indigo-50' : ''}
          `}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {/* カラーバー */}
          <div
            className={`
              absolute left-0 top-0 bottom-0 w-2 rounded-r
              transition-all duration-200
              ${isSelected ? 'w-3' : 'group-hover:w-2.5'}
            `}
            style={{
              backgroundColor: color,
              boxShadow: isSelected
                ? `2px 0 8px ${color}40, inset -1px 0 3px rgba(255,255,255,0.4)`
                : `1px 0 4px ${color}30`
            }}
          />

          {/* アイコン */}
          <span className="text-xl flex-shrink-0" role="img" aria-label={displayName}>
            {icon}
          </span>

          {/* カテゴリ名 */}
          <span
            className={`
              flex-1 font-semibold text-gray-700
              ${isSelected ? 'text-indigo-900 font-bold' : ''}
            `}
            style={{ fontSize: '18px' }}
          >
            {displayName}
          </span>

          {/* 展開アイコン */}
          {hasChildren && (
            <span className="text-gray-400">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </span>
          )}
        </button>

        {/* サブカテゴリ */}
        {hasChildren && isExpanded && (
          <div className="bg-gray-50">
            {category.categories!.map(subCat => renderCategory(subCat, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 border-r-2 border-slate-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
          {t('editor.blocks')}
        </h2>
      </div>

      {/* カテゴリリスト */}
      <div className="flex-1 overflow-y-auto">
        {categories.map(category => renderCategory(category))}
      </div>
    </div>
  );
}
