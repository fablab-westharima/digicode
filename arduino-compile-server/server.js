const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const mdns = require('multicast-dns')();

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// テンプレートファイルのパス
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'DigiCodeOTA.ino');
const TEMP_DIR = path.join(__dirname, 'temp');
const BUILD_DIR = path.join(__dirname, 'build');

// 一時ディレクトリの作成
async function ensureDirectories() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  await fs.mkdir(BUILD_DIR, { recursive: true });
  await fs.mkdir(path.join(__dirname, 'templates'), { recursive: true });
}

// テンプレートファイルのコピー（初回のみ）
async function ensureTemplate() {
  try {
    await fs.access(TEMPLATE_PATH);
  } catch {
    // テンプレートが存在しない場合、Arduino/DigiCodeOTA/DigiCodeOTA.inoからコピー
    const sourcePath = '/Users/ohahiso/Arduino/DigiCodeOTA/DigiCodeOTA.ino';
    try {
      const content = await fs.readFile(sourcePath, 'utf-8');
      await fs.writeFile(TEMPLATE_PATH, content, 'utf-8');
      console.log('✓ Template file copied from Arduino library');
    } catch (err) {
      console.error('✗ Failed to copy template:', err.message);
      throw new Error('Template file not found. Please ensure DigiCodeOTA.ino exists.');
    }
  }
}

// ユーザーコードをテンプレートに挿入
function insertUserCode(template, includes, globals, setupCode, loopCode) {
  let result = template;

  // includesを既存の#includeセクションの後に追加
  if (includes && includes.trim()) {
    // 最後の#includeの後に挿入
    const lastIncludeMatch = template.match(/#include\s+[<"].*[>"]\s*$/m);
    if (lastIncludeMatch) {
      const insertPos = lastIncludeMatch.index + lastIncludeMatch[0].length;
      result = result.slice(0, insertPos) + '\n' + includes + result.slice(insertPos);
    } else {
      // #includeがない場合は先頭に追加
      result = includes + '\n\n' + result;
    }
  }

  // globalsをuserSetup()の前に挿入
  if (globals && globals.trim()) {
    const userSetupMatch = result.match(/void userSetup\(\)/);
    if (userSetupMatch) {
      const insertPos = userSetupMatch.index;
      result = result.slice(0, insertPos) + globals + '\n\n' + result.slice(insertPos);
    }
  }

  // userSetup()の置き換え
  const setupReplacement = `void userSetup() {
  // Blocklyから生成されたセットアップコード
${setupCode}
}`;

  // userLoop()の置き換え
  const loopReplacement = `void userLoop() {
  // Blocklyから生成されたループコード
${loopCode}
}`;

  // 既存のuserSetup()とuserLoop()を置き換え
  result = result.replace(
    /void userSetup\(\) \{[\s\S]*?\n\}/m,
    setupReplacement
  );

  result = result.replace(
    /void userLoop\(\) \{[\s\S]*?\n\}/m,
    loopReplacement
  );

  return result;
}

// ライブラリはarduino-cliのデフォルトパス（~/Documents/Arduino/libraries/）を使用

// Arduino CLIでコンパイル
async function compileArduino(sketchPath, outputDir) {
  const fqbn = 'esp32:esp32:esp32';
  // arduino-cliのデフォルトライブラリパス（~/Documents/Arduino/libraries/）を使用
  const command = `arduino-cli compile --fqbn ${fqbn} --output-dir "${outputDir}" "${sketchPath}"`;

  console.log('Compiling with:', command);
  console.log('Using default Arduino libraries directory');

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5分タイムアウト（初回コンパイルは時間がかかる）
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    console.log('Compilation stdout:', stdout);
    if (stderr) {
      console.log('Compilation stderr:', stderr);
    }

    return { success: true, stdout, stderr };
  } catch (error) {
    console.error('Compilation error:', error);
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

// コンパイルエンドポイント
app.post('/api/compile', async (req, res) => {
  const { includes, globals, setupCode, loopCode } = req.body;

  if (!setupCode && !loopCode) {
    return res.status(400).json({
      success: false,
      error: 'setupCode or loopCode is required'
    });
  }

  const timestamp = Date.now();
  const projectName = `DigiCodeOTA_${timestamp}`;
  const projectDir = path.join(TEMP_DIR, projectName);
  const sketchPath = path.join(projectDir, `${projectName}.ino`);
  const outputDir = path.join(BUILD_DIR, projectName);

  try {
    // プロジェクトディレクトリ作成
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    // テンプレート読み込み
    const template = await fs.readFile(TEMPLATE_PATH, 'utf-8');

    // ユーザーコードを挿入
    const finalCode = insertUserCode(
      template,
      includes || '',
      globals || '',
      setupCode || '  Serial.println("User setup completed.");',
      loopCode || '  // No user code'
    );

    // スケッチファイルに書き込み
    await fs.writeFile(sketchPath, finalCode, 'utf-8');
    console.log(`✓ Sketch created: ${sketchPath}`);

    // コンパイル実行
    const compileResult = await compileArduino(sketchPath, outputDir);

    if (!compileResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Compilation failed',
        details: compileResult.error,
        stdout: compileResult.stdout,
        stderr: compileResult.stderr
      });
    }

    // .binファイルを探す
    const binFiles = await fs.readdir(outputDir);
    const binFile = binFiles.find(f => f.endsWith('.bin') && !f.includes('bootloader') && !f.includes('partitions'));

    if (!binFile) {
      return res.status(500).json({
        success: false,
        error: 'Binary file not found after compilation',
        files: binFiles
      });
    }

    const binPath = path.join(outputDir, binFile);
    console.log(`✓ Binary file: ${binPath}`);

    // .binファイルを読み込んで返す
    const binData = await fs.readFile(binPath);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${projectName}.bin"`,
      'Content-Length': binData.length
    });

    res.send(binData);

    // クリーンアップ（バックグラウンドで実行）
    setTimeout(async () => {
      try {
        await fs.rm(projectDir, { recursive: true, force: true });
        await fs.rm(outputDir, { recursive: true, force: true });
        console.log(`✓ Cleaned up: ${projectName}`);
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }, 5000);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// mDNSデバイス探索エンドポイント
app.get('/api/discover', async (req, res) => {
  const timeout = parseInt(req.query.timeout) || 3000; // デフォルト3秒
  const devices = [];
  const seenIps = new Set();

  console.log(`[mDNS] Starting device discovery (timeout: ${timeout}ms)...`);

  // mDNS応答ハンドラ
  const responseHandler = (response) => {
    // _digicode._tcp.local サービスを探す
    const digicodeAnswers = response.answers.filter(
      a => a.name && a.name.includes('_digicode._tcp.local')
    );

    // PTRレコードからサービス名を取得
    response.answers.forEach(answer => {
      if (answer.type === 'PTR' && answer.name === '_digicode._tcp.local') {
        console.log(`[mDNS] Found DigiCode service: ${answer.data}`);
      }
    });

    // SRVレコードからホスト名とポートを取得
    response.answers.forEach(answer => {
      if (answer.type === 'SRV' && answer.name && answer.name.includes('_digicode._tcp.local')) {
        const host = answer.data.target;
        const port = answer.data.port;
        console.log(`[mDNS] SRV: ${host}:${port}`);
      }
    });

    // Aレコード（IPv4）からIPアドレスを取得
    response.answers.forEach(answer => {
      if (answer.type === 'A' && !seenIps.has(answer.data)) {
        // digicode関連のホスト名かチェック
        if (answer.name && answer.name.toLowerCase().includes('digicode')) {
          seenIps.add(answer.data);
          const device = {
            hostname: answer.name,
            ip: answer.data,
            url: `http://${answer.data}`,
            mdnsName: answer.name
          };
          devices.push(device);
          console.log(`[mDNS] Found device: ${answer.name} -> ${answer.data}`);
        }
      }
    });

    // additionalセクションもチェック
    response.additionals?.forEach(answer => {
      if (answer.type === 'A' && !seenIps.has(answer.data)) {
        if (answer.name && answer.name.toLowerCase().includes('digicode')) {
          seenIps.add(answer.data);
          const device = {
            hostname: answer.name,
            ip: answer.data,
            url: `http://${answer.data}`,
            mdnsName: answer.name
          };
          devices.push(device);
          console.log(`[mDNS] Found device (additional): ${answer.name} -> ${answer.data}`);
        }
      }
    });
  };

  // 一時的なリスナーを追加
  mdns.on('response', responseHandler);

  // _digicode._tcp.local サービスをクエリ
  mdns.query({
    questions: [
      { name: '_digicode._tcp.local', type: 'PTR' }
    ]
  });

  // 一般的なDigiCodeホスト名もクエリ（フォールバック）
  const commonNames = [
    'digicode.local',
    'digicode-robot001.local',
    'digicode-robot002.local',
    'digicode-robot003.local',
    'digicode-robot004.local',
    'digicode-robot005.local'
  ];

  commonNames.forEach(name => {
    mdns.query({
      questions: [{ name, type: 'A' }]
    });
  });

  // タイムアウト後に結果を返す
  await new Promise(resolve => setTimeout(resolve, timeout));

  // リスナーを削除
  mdns.removeListener('response', responseHandler);

  console.log(`[mDNS] Discovery complete. Found ${devices.length} device(s)`);

  res.json({
    success: true,
    devices,
    scannedAt: new Date().toISOString()
  });
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    arduinoCli: 'available'
  });
});

// サーバー起動
async function startServer() {
  try {
    await ensureDirectories();
    await ensureTemplate();

    app.listen(PORT, () => {
      console.log('\n================================');
      console.log('Arduino Compilation Server');
      console.log('================================');
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Template: ${TEMPLATE_PATH}`);
      console.log(`Libraries: ~/Documents/Arduino/libraries/ (arduino-cli default)`);
      console.log(`Temp dir: ${TEMP_DIR}`);
      console.log(`Build dir: ${BUILD_DIR}`);
      console.log('================================\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
