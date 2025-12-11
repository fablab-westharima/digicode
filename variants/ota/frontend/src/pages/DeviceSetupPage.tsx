import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSerialStore } from '@/stores/serialStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { generateShortUuid, isValidUuid, uuidToSsid, uuidToMdns } from '@/lib/uuid';
import { RefreshCw, Trash2, CheckCircle2, XCircle, AlertCircle, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DeviceSetupPage() {
  const navigate = useNavigate();
  const { status, isSupported, connect, disconnect, send, output, clearOutput } = useSerialStore();
  const { devices, addDevice, removeDevice, setCurrentDevice } = useDeviceStore();

  const [deviceName, setDeviceName] = useState('');
  const [deviceUuid, setDeviceUuid] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [writeStatus, setWriteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConsole, setShowConsole] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  // WiFi管理用のstate
  interface WiFiEntry {
    ssid: string;
    isConnected: boolean;
  }
  const [wifiList, setWifiList] = useState<WiFiEntry[]>([]);
  const [newWifiSsid, setNewWifiSsid] = useState('');
  const [newWifiPassword, setNewWifiPassword] = useState('');
  const [isLoadingWifi, setIsLoadingWifi] = useState(false);
  const [wifiMessage, setWifiMessage] = useState('');

  // コンソール自動スクロール
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [output]);

  // WiFi一覧の自動読み込み（接続時）
  useEffect(() => {
    if (status === 'connected') {
      // 接続直後に一度だけ実行
      const timer = setTimeout(() => {
        loadWiFiList();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // 切断時はリセット
      setWifiList([]);
      setWifiMessage('');
    }
    // loadWiFiListは意図的に依存から除外（接続時のみトリガー）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // UUID自動生成
  const handleGenerateUuid = () => {
    setDeviceUuid(generateShortUuid());
  };

  // デバイス削除
  const handleRemoveDevice = (uuid: string) => {
    if (confirm(`デバイス「${devices.find(d => d.uuid === uuid)?.name}」を削除しますか？`)) {
      removeDevice(uuid);
    }
  };

  // シリアル出力の待機（タイムアウト付き）
  const waitForResponse = async (keyword: string, startIndex: number, timeout: number): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const currentOutput = useSerialStore.getState().output;
      if (currentOutput.slice(startIndex).some(line => line.includes(keyword))) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  };

  // 自動的にDHCP IPを固定化
  const autoSetStaticIp = async () => {
    if (status !== 'connected') return;

    try {
      const startIndex = useSerialStore.getState().output.length;

      // USE_CURRENT_IPコマンドでDHCPで取得したIPを固定化
      await send('USE_CURRENT_IP\n');
      await new Promise(resolve => setTimeout(resolve, 500));

      // GET_CONFIGで固定IP情報を取得
      await send('GET_CONFIG\n');
      const gotResponse = await waitForResponse('OK:UUID=', startIndex, 5000);

      if (!gotResponse) {
        console.warn('[DeviceSetup] GET_CONFIG response timeout');
        return;
      }

      const newOutput = useSerialStore.getState().output.slice(startIndex);
      let foundIp = '';

      for (const line of newOutput) {
        if (line.includes('OK:STATIC_IP=')) {
          foundIp = line.split('OK:STATIC_IP=')[1]?.trim() || '';
          break;
        }
      }

      if (foundIp) {
        console.log('[DeviceSetup] Static IP configured:', foundIp);
        setWifiMessage(`WiFiを追加し、IPアドレスを固定化しました (${foundIp})`);
      }
    } catch (error) {
      console.error('[DeviceSetup] Auto set static IP error:', error);
    }
  };

  // WiFi一覧を読み込み
  const loadWiFiList = async () => {
    if (status !== 'connected') return;

    setIsLoadingWifi(true);
    setWifiMessage('');

    try {
      await send('LIST_WIFI\n');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // outputから最新の状態を取得してWiFi一覧をパース
      const outputText = output.join('\n');
      const wifiLines = outputText.match(/\[\d+\]\s+(.+?)\s+\(password:/g);

      if (wifiLines) {
        const parsedWifi: WiFiEntry[] = wifiLines.map(line => {
          const match = line.match(/\[\d+\]\s+(.+?)\s+\(password:/);
          const ssid = match ? match[1].trim() : '';
          const isConnected = line.includes('[CONNECTED]');
          return { ssid, isConnected };
        });
        setWifiList(parsedWifi);
        setWifiMessage(''); // 成功時はメッセージクリア
      } else {
        setWifiList([]);
        setWifiMessage('WiFi接続が登録されていません');
      }
    } catch (error) {
      console.error('Load WiFi list error:', error);
      setWifiMessage('WiFi一覧の取得に失敗しました。');
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // WiFiを追加
  const handleAddWiFi = async () => {
    if (!newWifiSsid.trim() || !newWifiPassword.trim()) {
      setWifiMessage('SSIDとパスワードを入力してください。');
      return;
    }

    if (wifiList.length >= 5) {
      setWifiMessage('WiFiは最大5個まで保存できます。');
      return;
    }

    setIsLoadingWifi(true);
    setWifiMessage('WiFiを追加中...');

    try {
      await send(`ADD_WIFI:${newWifiSsid},${newWifiPassword}\n`);
      await new Promise(resolve => setTimeout(resolve, 500));

      setNewWifiSsid('');
      setNewWifiPassword('');
      setWifiMessage('WiFiを追加しました。再起動後に接続します...');

      // WiFi一覧を再読み込み
      await loadWiFiList();

      // WiFi接続済みの場合は自動的にIPを固定化
      const currentWifiList = await loadWiFiList();
      const isConnected = currentWifiList.some(w => w.isConnected);

      if (isConnected) {
        setWifiMessage('WiFi接続成功。DHCPで取得したIPを固定化中...');
        await autoSetStaticIp();
      } else {
        setWifiMessage('WiFiを追加しました。ESP32を再起動して接続してください。');
      }
    } catch (error) {
      console.error('Add WiFi error:', error);
      setWifiMessage('WiFiの追加に失敗しました。');
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // WiFiを削除
  const handleRemoveWiFi = async (ssid: string) => {
    if (!confirm(`WiFi「${ssid}」を削除しますか？`)) {
      return;
    }

    setIsLoadingWifi(true);
    setWifiMessage('');

    try {
      await send(`REMOVE_WIFI:${ssid}\n`);
      await new Promise(resolve => setTimeout(resolve, 500));

      setWifiMessage('WiFiを削除しました。');

      // 一覧を再読み込み
      await loadWiFiList();
    } catch (error) {
      console.error('Remove WiFi error:', error);
      setWifiMessage('WiFiの削除に失敗しました。');
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // デバイス設定書き込み（Arduino版）
  const handleWriteDevice = async () => {
    if (!isValidUuid(deviceUuid)) {
      setErrorMessage('無効なUUIDです。英数字とハイフン（3-20文字）で入力してください。');
      setWriteStatus('error');
      return;
    }

    if (!deviceName.trim()) {
      setErrorMessage('デバイス名を入力してください。');
      setWriteStatus('error');
      return;
    }

    if (status !== 'connected') {
      setErrorMessage('ESP32に接続してから設定を書き込んでください。');
      setWriteStatus('error');
      return;
    }

    setIsWriting(true);
    setWriteStatus('idle');
    setErrorMessage('');

    try {
      // Arduinoシリアルコマンド送信
      await send(`SET_UUID:${deviceUuid}\n`);
      await new Promise(resolve => setTimeout(resolve, 100));

      await send(`SET_NAME:${deviceName}\n`);
      await new Promise(resolve => setTimeout(resolve, 100));

      await send(`SAVE_CONFIG\n`);
      await new Promise(resolve => setTimeout(resolve, 500));

      // デバイス情報をローカルストレージに保存
      const device = {
        uuid: deviceUuid,
        name: deviceName,
        ssid: uuidToSsid(deviceUuid),
        lastConnected: new Date().toISOString(),
      };
      addDevice(device);
      setCurrentDevice(device);

      setWriteStatus('success');

      // フォームをクリア
      setDeviceName('');
      setDeviceUuid('');

      // 3秒後に自動リセット案内
      setTimeout(() => {
        if (confirm('設定を反映するにはESP32を再起動する必要があります。\n今すぐ再起動しますか？')) {
          send('RESTART\n');
          disconnect();
        }
      }, 1000);
    } catch (error) {
      console.error('Write device error:', error);
      setErrorMessage('エラーが発生しました。');
      setWriteStatus('error');
    } finally {
      setIsWriting(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Web Serial APIはこのブラウザでサポートされていません。Chrome または Edge ブラウザをご使用ください。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">デバイス設定</h1>
        <p className="text-muted-foreground mt-2">
          ESP32にデバイスUUIDと名前を設定します（混信対策）
        </p>
      </div>

      {/* 接続セクション */}
      <Card>
        <CardHeader>
          <CardTitle>1. ESP32に接続</CardTitle>
          <CardDescription>
            USBケーブルでESP32をPCに接続してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              status === 'connected' ? 'bg-green-500' :
              status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-gray-400'
            }`} />
            <span className="text-sm">
              {status === 'connected' ? '接続中' :
               status === 'connecting' ? '接続処理中...' :
               '未接続'}
            </span>
          </div>

          {status === 'connected' ? (
            <Button variant="destructive" onClick={disconnect}>
              切断
            </Button>
          ) : (
            <Button onClick={connect} disabled={status === 'connecting'}>
              {status === 'connecting' ? '接続中...' : 'ESP32に接続'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* デバイス設定セクション */}
      {status === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle>2. デバイス情報を設定</CardTitle>
            <CardDescription>
              デバイス名とUUIDを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">デバイス名（例: 私のロボット）</Label>
              <Input
                id="device-name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="デバイス名を入力"
                disabled={isWriting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-uuid">UUID（英数字3-20文字）</Label>
              <div className="flex gap-2">
                <Input
                  id="device-uuid"
                  value={deviceUuid}
                  onChange={(e) => setDeviceUuid(e.target.value.toLowerCase())}
                  placeholder="uuid または自動生成"
                  disabled={isWriting}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleGenerateUuid}
                  disabled={isWriting}
                  title="ランダムUUID生成"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              {deviceUuid && (
                <div className="text-sm text-muted-foreground space-y-1 bg-muted p-3 rounded">
                  <p><strong>SSID:</strong> {uuidToSsid(deviceUuid)}</p>
                  <p><strong>mDNS:</strong> {uuidToMdns(deviceUuid)}</p>
                </div>
              )}
            </div>

            <Button
              onClick={handleWriteDevice}
              disabled={isWriting || !deviceName.trim() || !deviceUuid.trim()}
              className="w-full"
            >
              {isWriting ? 'デバイス設定中...' : 'デバイス設定を書き込む'}
            </Button>

            {/* ステータス表示 */}
            {writeStatus === 'success' && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  ✓ デバイス設定が完了しました！ESP32を再起動すると設定が反映されます。
                </AlertDescription>
              </Alert>
            )}

            {writeStatus === 'error' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground bg-green-50 p-3 rounded space-y-2">
              <p className="font-semibold">💡 設定について:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>UUIDはデバイスの識別IDです</li>
                <li>WiFi接続時にこのUUIDで識別します</li>
                <li>同じ会場で複数のデバイスを使う場合、それぞれ異なるUUIDを設定してください</li>
                <li>設定はESP32内部に永続保存されます</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* WiFi設定セクション */}
      {status === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle>3. WiFi設定（ホームルーター/テザリング）</CardTitle>
            <CardDescription>
              ESP32が接続するWiFiを設定します（最大5個）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 保存済みWiFi一覧 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>保存済みWiFi ({wifiList.length}/5)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadWiFiList}
                  disabled={isLoadingWifi}
                >
                  {isLoadingWifi ? '読み込み中...' : '🔄 再読み込み'}
                </Button>
              </div>

              {wifiList.length > 0 ? (
                <div className="space-y-2 border rounded-lg p-3">
                  {wifiList.map((wifi, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{wifi.ssid}</span>
                        {wifi.isConnected && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                            接続中
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveWiFi(wifi.ssid)}
                        disabled={isLoadingWifi}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-4 text-center text-muted-foreground bg-muted/30">
                  {isLoadingWifi ? '読み込み中...' : 'WiFi接続が登録されていません'}
                </div>
              )}
            </div>

            {/* WiFi追加フォーム */}
            <div className="border-t pt-4 space-y-3">
              <Label>新しいWiFiを追加</Label>
              <div className="space-y-2">
                <Input
                  placeholder="WiFi SSID（例: MyHomeWiFi）"
                  value={newWifiSsid}
                  onChange={(e) => setNewWifiSsid(e.target.value)}
                  disabled={isLoadingWifi}
                />
                <Input
                  type="password"
                  placeholder="WiFiパスワード"
                  value={newWifiPassword}
                  onChange={(e) => setNewWifiPassword(e.target.value)}
                  disabled={isLoadingWifi}
                />
                <Button
                  onClick={handleAddWiFi}
                  disabled={isLoadingWifi || !newWifiSsid.trim() || !newWifiPassword.trim()}
                  className="w-full"
                >
                  WiFiを追加
                </Button>
              </div>
            </div>

            {/* WiFiメッセージ */}
            {wifiMessage && (
              <Alert>
                <AlertDescription>{wifiMessage}</AlertDescription>
              </Alert>
            )}

            {/* 説明 */}
            <div className="text-sm text-muted-foreground bg-green-50 p-3 rounded space-y-2">
              <p className="font-semibold">💡 WiFi設定について:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>複数のWiFiを登録でき、ESP32は上から順に接続を試みます</li>
                <li>自宅とスマホのテザリングを両方登録しておくと便利です</li>
                <li>WiFi未接続時は自動的にAPモードになります</li>
                <li>設定後はESP32を再起動してください</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 登録済みデバイス一覧 */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>登録済みデバイス</CardTitle>
            <CardDescription>
              過去に設定したデバイスの一覧
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.uuid}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{device.name}</p>
                    <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
                      <p>UUID: {device.uuid}</p>
                      <p>SSID: {device.ssid}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDevice(device.uuid)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* シリアルコンソール */}
      {status === 'connected' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                <CardTitle>シリアルコンソール</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConsole(!showConsole)}
                >
                  {showConsole ? '非表示' : '表示'}
                </Button>
                {showConsole && (
                  <Button variant="outline" size="sm" onClick={clearOutput}>
                    クリア
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>
              ESP32からのシリアル出力をリアルタイムで表示
            </CardDescription>
          </CardHeader>
          {showConsole && (
            <CardContent>
              <div
                ref={consoleRef}
                className="bg-black text-green-400 font-mono text-xs p-4 rounded h-64 overflow-y-auto"
              >
                {output.length === 0 ? (
                  <div className="text-gray-500">出力待機中...</div>
                ) : (
                  output.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 戻るボタン */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigate('/')}>
          TOPページに戻る
        </Button>
      </div>
    </div>
  );
}
