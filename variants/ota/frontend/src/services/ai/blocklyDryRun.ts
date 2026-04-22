import * as Blockly from 'blockly';

// ヘッドレス workspace で domToWorkspace を実行し、接続構造の妥当性を検証する。
// 静的 XML 検証（xmlValidator）では検出できない以下を捕捉：
//   - value 型のブロックが statement 位置に置かれている
//   - statement 型のブロックが value 位置に置かれている
//   - next/previous の接続ルール違反
//   - ブロックタイプは登録済みだがフィールド値が不正
export function dryRunBlocklyXml(xml: string): { valid: boolean; error?: string } {
  let workspace: Blockly.Workspace | null = null;
  try {
    workspace = new Blockly.Workspace();
    const dom = Blockly.utils.xml.textToDom(xml);
    Blockly.Xml.domToWorkspace(dom, workspace);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    workspace?.dispose();
  }
}
