#!/usr/bin/env node
/**
 * DigiCode ライブラリ管理スクリプト
 * GitHubからライブラリをインストール・アップデート
 *
 * Usage:
 *   node scripts/manage-libraries.js list       - インストール済みライブラリ一覧
 *   node scripts/manage-libraries.js install    - 全ライブラリをインストール
 *   node scripts/manage-libraries.js install <name> - 特定ライブラリをインストール
 *   node scripts/manage-libraries.js update     - 全ライブラリをアップデート
 *   node scripts/manage-libraries.js update <name>  - 特定ライブラリをアップデート
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LIBRARIES_DIR = path.join(__dirname, '..', 'libraries');
const CONFIG_FILE = path.join(__dirname, '..', 'libraries.json');

// ライブラリ設定を読み込み
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error('Error: libraries.json not found');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

// インストール済みライブラリ一覧
function listLibraries() {
  const config = loadConfig();
  console.log('\n=== DigiCode ライブラリ一覧 ===\n');

  config.libraries.forEach(lib => {
    const installed = fs.existsSync(path.join(LIBRARIES_DIR, lib.name));
    const status = installed ? '✓ インストール済み' : '✗ 未インストール';
    const required = lib.required ? '[必須]' : '[オプション]';

    console.log(`${status} ${required} ${lib.name} (${lib.version})`);
    console.log(`  ${lib.description}`);
    console.log(`  GitHub: https://github.com/${lib.github}`);
    console.log('');
  });
}

// GitHubからライブラリをダウンロード
function downloadLibrary(lib) {
  const targetDir = path.join(LIBRARIES_DIR, lib.name);
  const zipUrl = `https://github.com/${lib.github}/archive/refs/heads/main.zip`;
  const masterZipUrl = `https://github.com/${lib.github}/archive/refs/heads/master.zip`;
  const tagZipUrl = lib.version ? `https://github.com/${lib.github}/archive/refs/tags/${lib.version}.zip` : null;

  console.log(`\nInstalling ${lib.name}...`);

  // 既存のディレクトリを削除
  if (fs.existsSync(targetDir)) {
    console.log(`  Removing existing ${lib.name}...`);
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  // 一時ディレクトリ
  const tempDir = path.join(LIBRARIES_DIR, '.temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const zipFile = path.join(tempDir, `${lib.name}.zip`);

  // ダウンロード試行 (tag → main → master)
  const urls = [tagZipUrl, zipUrl, masterZipUrl].filter(Boolean);
  let downloaded = false;

  for (const url of urls) {
    try {
      console.log(`  Downloading from ${url}...`);
      execSync(`curl -sL "${url}" -o "${zipFile}"`, { stdio: 'pipe' });

      // ZIPファイルが有効かチェック
      const stats = fs.statSync(zipFile);
      if (stats.size > 1000) {
        downloaded = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!downloaded) {
    console.error(`  Error: Failed to download ${lib.name}`);
    return false;
  }

  // 解凍
  try {
    console.log(`  Extracting...`);
    execSync(`unzip -q "${zipFile}" -d "${tempDir}"`, { stdio: 'pipe' });

    // 解凍されたディレクトリを探す
    const extractedDirs = fs.readdirSync(tempDir).filter(f =>
      f.startsWith(lib.name.replace(/_/g, '-')) ||
      f.startsWith(lib.github.split('/')[1]) ||
      f.includes(lib.name)
    );

    if (extractedDirs.length === 0) {
      // フォールバック: .temp内の最初のディレクトリを使用
      const allDirs = fs.readdirSync(tempDir).filter(f =>
        fs.statSync(path.join(tempDir, f)).isDirectory()
      );
      if (allDirs.length > 0) {
        extractedDirs.push(allDirs[0]);
      }
    }

    if (extractedDirs.length > 0) {
      const extractedDir = path.join(tempDir, extractedDirs[0]);
      fs.renameSync(extractedDir, targetDir);
      console.log(`  ✓ ${lib.name} installed successfully`);
    } else {
      console.error(`  Error: Could not find extracted directory`);
      return false;
    }
  } catch (e) {
    console.error(`  Error extracting: ${e.message}`);
    return false;
  } finally {
    // クリーンアップ
    if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);
  }

  return true;
}

// インストール
function installLibraries(libraryName = null) {
  const config = loadConfig();

  // librariesディレクトリを作成
  if (!fs.existsSync(LIBRARIES_DIR)) {
    fs.mkdirSync(LIBRARIES_DIR, { recursive: true });
  }

  const libraries = libraryName
    ? config.libraries.filter(l => l.name.toLowerCase() === libraryName.toLowerCase())
    : config.libraries;

  if (libraries.length === 0) {
    console.error(`Library "${libraryName}" not found in config`);
    process.exit(1);
  }

  console.log('\n=== ライブラリインストール ===');

  let success = 0;
  let failed = 0;

  for (const lib of libraries) {
    if (downloadLibrary(lib)) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`\n=== 完了: ${success} 成功, ${failed} 失敗 ===\n`);
}

// アップデート (インストールと同じ処理)
function updateLibraries(libraryName = null) {
  console.log('\n=== ライブラリアップデート ===');
  installLibraries(libraryName);
}

// メイン
const args = process.argv.slice(2);
const command = args[0] || 'list';
const target = args[1];

switch (command) {
  case 'list':
    listLibraries();
    break;
  case 'install':
    installLibraries(target);
    break;
  case 'update':
    updateLibraries(target);
    break;
  default:
    console.log(`
DigiCode ライブラリ管理ツール

Usage:
  node scripts/manage-libraries.js list           ライブラリ一覧
  node scripts/manage-libraries.js install        全ライブラリをインストール
  node scripts/manage-libraries.js install <name> 特定ライブラリをインストール
  node scripts/manage-libraries.js update         全ライブラリをアップデート
  node scripts/manage-libraries.js update <name>  特定ライブラリをアップデート
`);
}
