#!/bin/bash
#
# DigiCode フロントエンド デプロイスクリプト
#
# 目的: 未コミット変更がある状態でのデプロイを防ぐ
#       （--commit-dirty=true を使った過去事例の再発防止）
#
# 詳細: prompt/maintenance/05-03_教訓・注意事項(機能実装関連).md ルール30
#       prompt/maintenance/12_2026-04-10_未コミット変更の整理記録.md
#
# 使い方: ./scripts/deploy-frontend.sh
#
set -e

# プロジェクトルートを取得
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/variants/ota/frontend"

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
echo "🔨 フロントエンドをビルド..."

cd "$FRONTEND_DIR"
npm run build

echo ""
echo "🚀 Cloudflare Pages にデプロイ..."

# 最新コミットのSHAとメッセージ1行目を取得
# 注: wrangler pages deploy は --commit-message に特殊文字（∞、絵文字等）
# が含まれていると「Invalid UTF-8」エラーで失敗する場合がある。
# そのため ASCII安全な形式（"<shortSha>: <ASCII化されたタイトル>"）で渡す。
COMMIT_SHA="$(git rev-parse --short HEAD)"
COMMIT_TITLE_RAW="$(git log -1 --pretty=%s)"
# 非ASCII文字をスペースに置換（簡易的な ASCII 化）
COMMIT_TITLE_ASCII="$(echo "$COMMIT_TITLE_RAW" | LC_ALL=C tr -c '[:print:][:space:]' ' ' | tr -s ' ')"
COMMIT_MESSAGE="${COMMIT_SHA}: ${COMMIT_TITLE_ASCII}"

# --commit-dirty=true は使わない
npx wrangler pages deploy dist \
  --project-name digicode-frontend \
  --commit-hash "$COMMIT_SHA" \
  --commit-message "$COMMIT_MESSAGE"

echo ""
echo "✅ デプロイ完了"
echo ""
echo "本番URL: https://code.fablab-westharima.jp"
echo "確認すること:"
echo "  - エディタが正常に表示される"
echo "  - 主要機能の動作確認"
