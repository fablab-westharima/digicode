/**
 * PID Parameter Tuning Panel
 * Real-time adjustment of PID parameters with presets
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePIDTuningStore } from '@/stores/pidTuningStore';
import { useSerialStore } from '@/stores/serialStore';
import { useWifiStore } from '@/stores/wifiStore';
import { Save, RotateCcw, Send, Trash2 } from 'lucide-react';

interface PIDTuningPanelProps {
  className?: string;
}

export function PIDTuningPanel({ className }: PIDTuningPanelProps) {
  const {
    kp, ki, kd,
    setKp, setKi, setKd,
    presets, currentPresetId,
    savePreset, loadPreset, deletePreset,
    reset
  } = usePIDTuningStore();

  const { send: serialSend, status: serialStatus } = useSerialStore();
  const { send: wifiSend, status: wifiStatus } = useWifiStore();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  // Check if any connection is available
  const isConnected = serialStatus === 'connected' ||
                      wifiStatus === 'connected';

  // Send PID parameters to ESP32
  const sendToESP32 = async () => {
    const command = `PID:${kp},${ki},${kd}\n`;

    if (serialStatus === 'connected') {
      await serialSend(command);
    } else if (wifiStatus === 'connected') {
      await wifiSend(command);
    }
  };

  // Handle preset selection
  const handlePresetChange = (presetId: string) => {
    if (presetId === 'custom') {
      return;
    }
    loadPreset(presetId);
  };

  // Handle save preset
  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim(), presetDescription.trim() || undefined);
      setPresetName('');
      setPresetDescription('');
      setSaveDialogOpen(false);
    }
  };

  // Get current preset or "custom"
  const currentValue = currentPresetId || 'custom';

  // Slider configuration for each parameter
  const sliderConfigs = [
    {
      label: 'Kp (比例ゲイン)',
      value: kp,
      setValue: setKp,
      min: 0,
      max: 2,
      step: 0.01,
      description: '誤差に比例した出力'
    },
    {
      label: 'Ki (積分ゲイン)',
      value: ki,
      setValue: setKi,
      min: 0,
      max: 0.01,
      step: 0.00001,
      description: '定常偏差を解消'
    },
    {
      label: 'Kd (微分ゲイン)',
      value: kd,
      setValue: setKd,
      min: 0,
      max: 50,
      step: 0.1,
      description: '急激な変化を抑制'
    }
  ];

  return (
    <div className={`flex flex-col bg-[#161B22] border border-[#2E333D] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0D1117] border-b border-[#2E333D]">
        <span className="text-sm text-[#E6EDF3] font-medium">PIDチューニング</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-xs text-[#8B949E] hover:text-[#E6EDF3] h-6 px-2"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            リセット
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-4">
        {/* Preset Selector */}
        <div className="space-y-1">
          <Label className="text-xs text-[#8B949E]">プリセット</Label>
          <div className="flex gap-2">
            <Select value={currentValue} onValueChange={handlePresetChange}>
              <SelectTrigger className="flex-1 h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] text-sm">
                <SelectValue placeholder="プリセットを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">カスタム</SelectItem>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
              className="h-8 px-2 border-[#2E333D] bg-[#0D1117]"
            >
              <Save className="w-3 h-3" />
            </Button>
            {currentPresetId && !currentPresetId.startsWith('default-') &&
             !currentPresetId.startsWith('aggressive-') &&
             !currentPresetId.startsWith('smooth-') &&
             !currentPresetId.startsWith('micromouse-') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deletePreset(currentPresetId)}
                className="h-8 px-2 border-[#2E333D] bg-[#0D1117] text-red-500 hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* PID Sliders */}
        {sliderConfigs.map((config) => (
          <div key={config.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-[#8B949E]">{config.label}</Label>
              <Input
                type="number"
                value={config.value}
                onChange={(e) => config.setValue(parseFloat(e.target.value) || 0)}
                step={config.step}
                min={config.min}
                max={config.max}
                className="w-24 h-6 text-right bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] text-xs"
              />
            </div>
            <Slider
              value={[config.value]}
              onValueChange={([value]) => config.setValue(value)}
              min={config.min}
              max={config.max}
              step={config.step}
              className="w-full"
            />
            <p className="text-[10px] text-[#8B949E]">{config.description}</p>
          </div>
        ))}

        {/* Send Button */}
        <div className="pt-2 border-t border-[#2E333D]">
          <Button
            onClick={sendToESP32}
            disabled={!isConnected}
            className="w-full bg-green-600 hover:bg-green-700 text-sm"
          >
            <Send className="w-3 h-3 mr-2" />
            ESP32に送信
          </Button>
          {!isConnected && (
            <p className="text-[10px] text-[#8B949E] text-center mt-1">
              ESP32に接続してください
            </p>
          )}
        </div>

        {/* Generated Code Preview */}
        <div className="pt-2 border-t border-[#2E333D]">
          <Label className="text-xs text-[#8B949E] mb-1 block">生成コード</Label>
          <pre className="bg-[#0D1117] p-2 rounded text-[10px] text-[#E6EDF3] overflow-x-auto font-mono">
{`pid_init(${kp}, ${ki}, ${kd});`}
          </pre>
        </div>
      </div>

      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>プリセットを保存</DialogTitle>
            <DialogDescription>
              現在のPIDパラメータをプリセットとして保存します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">プリセット名</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="例: 高速ライントレース"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset-desc">説明（任意）</Label>
              <Input
                id="preset-desc"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="例: 競技用の高速設定"
              />
            </div>
            <div className="bg-[#0D1117] p-3 rounded-md text-sm border border-[#2E333D]">
              <p className="text-[#E6EDF3]"><strong>Kp:</strong> {kp}</p>
              <p className="text-[#E6EDF3]"><strong>Ki:</strong> {ki}</p>
              <p className="text-[#E6EDF3]"><strong>Kd:</strong> {kd}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
