// ツールボックスXMLをパースしてカテゴリ構造に変換

export interface ToolboxCategory {
  name: string;
  colour: string;
  icon?: string;
  blocks?: string[];
  categories?: ToolboxCategory[];
  custom?: string;
}

export function parseToolboxXml(toolboxXml: string): ToolboxCategory[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(toolboxXml, 'text/xml');
  const xmlElement = doc.querySelector('xml');

  if (!xmlElement) return [];

  return parseCategories(xmlElement);
}

function parseCategories(parent: Element): ToolboxCategory[] {
  const categories: ToolboxCategory[] = [];
  const categoryElements = parent.querySelectorAll(':scope > category');

  categoryElements.forEach(catEl => {
    const category: ToolboxCategory = {
      name: catEl.getAttribute('name') || '',
      colour: catEl.getAttribute('colour') || '#6366F1',
    };

    // カスタムカテゴリ（変数、関数など）
    const custom = catEl.getAttribute('custom');
    if (custom) {
      category.custom = custom;
    }

    // サブカテゴリを再帰的にパース
    const subCategories = parseCategories(catEl);
    if (subCategories.length > 0) {
      category.categories = subCategories;
    }

    // ブロックをパース
    const blockElements = catEl.querySelectorAll(':scope > block');
    if (blockElements.length > 0) {
      category.blocks = Array.from(blockElements).map(
        block => block.getAttribute('type') || ''
      );
    }

    categories.push(category);
  });

  return categories;
}
