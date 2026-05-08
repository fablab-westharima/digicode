#!/bin/bash
# DigiCode - Block-based ESP32 Programming Tool
# Copyright (C) 2024-2026 DigiCo LLC
#
# Licensed under the GNU Affero General Public License version 3 or later.
# See LICENSE file in the repository root for full terms.

#
# DigiCode バックエンド デプロイスクリプト
#
# 目的: 未コミット変更がある状態でのデプロイを防ぐ
#       （フロントエンドと同じ理由）
#
# 詳細: prompt/maintenance/05-03_教訓・注意事項(機能実装関連).md ルール30
#       prompt/maintenance/12_2026-04-10_未コミット変更の整理記録.md
#
# 使い方: ./scripts/deploy-backend.sh
#
set -e

# プロジェクトルートを取得
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/esp32-blockly-backend"

cd "$PROJECT_ROOT"

echo "🔍 git status を確認..."

# 未コミット変更チェック
# .claude/settings.local.json は除外（ローカル設定のため）
if [ -n "$(git status --porcelain | grep -v '^.. \.claude/settings\.local\.json$')" ]; then
  echo "❌ 未コミット変更があります。コミットしてから実行してください。"
  echo ""
  echo "未コミット変更:"
  git status --short | grep -v '^.. \.claude/settings\.local\.json$'
  echo ""
  echo "対処方法:"
  echo "  1. 変更をレビュー: git diff"
  echo "  2. ステージング: git add <files>"
  echo "  3. コミット: git commit -m \"<message>\""
  echo "  4. 再度このスクリプトを実行"
  exit 1
fi

echo "✅ 未コミット変更なし"
echo ""
echo "📋 マイグレーションの本番適用状況を確認..."

cd "$BACKEND_DIR"
npx wrangler d1 migrations list esp32-editor-db --remote

echo ""
read -p "上記のマイグレーション状況を確認しました。デプロイを続行しますか？ (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "デプロイを中断しました"
  exit 1
fi

echo ""
echo "🚀 Cloudflare Workers にデプロイ..."

npx wrangler deploy

echo ""
echo "✅ デプロイ完了"
echo ""
echo "API URL: https://esp32-blockly-backend.kazunari-takeda.workers.dev"
echo "確認すること:"
echo "  - curl https://esp32-blockly-backend.kazunari-takeda.workers.dev/health"
echo "  - 認証フローの動作"
