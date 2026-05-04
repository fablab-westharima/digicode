import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import * as Blockly from 'blockly';
import 'blockly/blocks';
import * as Ja from 'blockly/msg/ja';
import * as En from 'blockly/msg/en';
import * as Es from 'blockly/msg/es';
import * as Pt from 'blockly/msg/pt';
import * as ZhHant from 'blockly/msg/zh-hant';
import { javascriptGenerator } from 'blockly/javascript';
import { useTranslation } from 'react-i18next';
import { useRobotModeStore } from '../../stores/robotModeStore';
import { useFavoriteCategoriesStore } from '../../stores/favoriteCategoriesStore';
import { useBoardStore } from '../../stores/boardStore';
import { digiCodeDarkTheme } from './blocklyTheme';
import { populateBlocklyMessages } from '@/utils/blocklyMessages';
import { FavoriteSettingsDialog } from './FavoriteSettingsDialog';
// Old esp32BlocksArduino.ts removed - using arduino/core/esp32Blocks with Blockly.Msg.*
import '../../blocks/arduino/core/esp32Blocks';
import '../../blocks/arduino/robot/humanoidBlocks';
import '../../blocks/arduino/robot/wheelBlocks';
import '../../blocks/arduino/robot/transformBlocks';
import '../../blocks/sensorBlocks';
// Old audioBlocks.ts removed - using arduino/audio/audioBlocks with Blockly.Msg.*
import '../../blocks/arduino/audio/audioBlocks';
// Old neopixelBlocks.ts removed - using arduino/display/neopixelBlocks with Blockly.Msg.*
import '../../blocks/arduino/display/neopixelBlocks';
// Old servoBlocks.ts removed - using arduino/actuator/servoBlocks with Blockly.Msg.*
import '../../blocks/arduino/actuator/servoBlocks';
// Old motorBlocks.ts removed - using arduino/actuator/motorBlocks with Blockly.Msg.*
import '../../blocks/arduino/actuator/motorBlocks';
// Old stepperBlocks.ts removed - using arduino/actuator/stepperBlocks with Blockly.Msg.*
import '../../blocks/arduino/actuator/stepperBlocks';
// Old displayBlocks.ts removed - using arduino/display/displayBlocks with Blockly.Msg.*
import '../../blocks/arduino/display/displayBlocks';
// Old lineSensorBlocks.ts removed - using arduino/sensor/lineSensorBlocks with Blockly.Msg.*
import '../../blocks/arduino/sensor/lineSensorBlocks';
// Old encoderBlocks.ts removed - using arduino/sensor/encoderBlocks with Blockly.Msg.*
import '../../blocks/arduino/sensor/encoderBlocks';
// Old wallSensorBlocks.ts removed - using arduino/sensor/wallSensorBlocks with Blockly.Msg.*
import '../../blocks/arduino/sensor/wallSensorBlocks';
// Old pidBlocks.ts removed - using arduino/robot/pidBlocks with Blockly.Msg.*
import '../../blocks/arduino/robot/pidBlocks';
// Old qtrSensorBlocks.ts removed - using arduino/sensor/qtrSensorBlocks with Blockly.Msg.*
import '../../blocks/arduino/sensor/qtrSensorBlocks';
// Old differentialDriveBlocks.ts removed - using arduino/robot/differentialDriveBlocks with Blockly.Msg.*
import '../../blocks/arduino/robot/differentialDriveBlocks';
// Old arrayBlocks.ts removed - using arduino/data/arrayBlocks with Blockly.Msg.*
import '../../blocks/arduino/data/arrayBlocks';
// 新しいセンサーブロック（Arduino）
import '../../blocks/arduino/sensor/digitalSensorBlocks';
import '../../blocks/arduino/sensor/analogSensorBlocks';
// MQTT / Home Assistant（Arduino）
import '../../blocks/arduino/communication/mqttBlocks';
import '../../blocks/arduino/communication/arduinoHABlocks';
// Azure IoT / IoT Cloud abstraction (51.md Phase A+B、第78回 commit #4-#5)
import '../../blocks/arduino/communication/azureIotBlocks';
import '../../blocks/arduino/communication/iotCloudBlocks';
import '../../blocks/arduino/communication/notificationBlocks';
import '../../blocks/arduino/communication/googleServicesBlocks';
import '../../blocks/arduino/communication/espnowBlocks';
import '../../blocks/arduino/sensor/hx711Blocks';
import '../../blocks/arduino/display/oledSsd1306Blocks';
import '../../blocks/arduino/display/tm1637Blocks';
import '../../blocks/arduino/display/max7219Blocks';
import '../../blocks/arduino/core/esp32TouchBlocks';
import '../../blocks/arduino/display/epaperBlocks';
import '../../blocks/arduino/motor/stepperDriverBlocks';
import '../../blocks/arduino/sensor/piezoBlocks';
import '../../blocks/arduino/communication/loraBlocks';
import '../../blocks/arduino/sensor/gpsBlocks';
import '../../blocks/arduino/actuator/relayBlocks';
import '../../blocks/arduino/communication/modbusBlocks';
import '../../blocks/arduino/sensor/sensorAirQualityBlocks';
import '../../blocks/arduino/display/neomatrixBlocks';
import '../../blocks/arduino/sensor/microphoneBlocks';
import '../../blocks/arduino/m5stack/m5stackBlocks';
// IoT通信（Arduino）
import '../../blocks/arduino/communication/httpBlocks';
import '../../blocks/arduino/communication/jsonBlocks';
import '../../blocks/arduino/communication/otaBlocks';
import '../../blocks/arduino/communication/wifiBlocks';
import '../../blocks/arduino/communication/i2cSpiBlocks';
import '../../blocks/arduino/communication/bleBlocks';
import '../../blocks/arduino/communication/webSocketBlocks';
import '../../blocks/arduino/communication/uart2Blocks';
import '../../blocks/arduino/communication/irBlocks';
import '../../blocks/arduino/communication/rfidBlocks';
import '../../blocks/arduino/communication/canBlocks';
import '../../blocks/arduino/camera/cameraBlocks';
import '../../blocks/arduino/audio/dfplayerBlocks';
import '../../blocks/arduino/display/tftBlocks';
import '../../blocks/arduino/core/interruptBlocks';
import '../../blocks/arduino/storage/storageNvsBlocks';
import '../../blocks/arduino/storage/storageFsBlocks';
import '../../blocks/arduino/storage/timeBlocks';
import '../../blocks/arduino/sensor/sensorMotionBlocks';
import '../../blocks/arduino/sensor/sensorEnvironmentBlocks';
import '../../blocks/arduino/sensor/sensorCurrentBlocks';
import '../../blocks/arduino/sensor/sensorTofBlocks';
import '../../blocks/arduino/sensor/sensorMagEncoderBlocks';
import '../../blocks/arduino/display/lcdBlocks';
import '../../blocks/common/builtinBlockOverrides';
import { generateToolbox } from './toolboxGenerator';

// 日本語ロケールを設定
Blockly.setLocale(Ja);

interface BlocklyEditorProps {
  initialXml?: string;
  onWorkspaceChange?: (xml: string, code: string) => void;
  toolboxXml?: string; // Optional now, will use language-specific toolbox if not provided
}

export interface BlocklyEditorRef {
  loadXml: (xml: string) => void;
  appendBlocks: (xml: string) => void;
  setReadOnly: (readOnly: boolean) => void;
  centerView: () => void;
}

export const BlocklyEditor = forwardRef<BlocklyEditorRef, BlocklyEditorProps>(
  ({ initialXml, onWorkspaceChange, toolboxXml }, ref) => {
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const savedXmlRef = useRef<string>(initialXml || '<xml></xml>');
    const languageChangeSavedRef = useRef<boolean>(false); // 言語変更でXML保存済みフラグ
    const { mode: robotMode } = useRobotModeStore();
    const { favorites } = useFavoriteCategoriesStore();
    // ボード選択に応じてツールボックスの可視性フィルタが働く (BP1-2c)。
    // selectedBoardId を購読することでボード切替時に currentToolbox が再計算される。
    const selectedBoardId = useBoardStore(s => s.selectedBoardId);
    const selectedBoard = useBoardStore.getState().getSelectedBoard();
    void selectedBoardId; // 購読目的、lint 抑制
    const { i18n } = useTranslation();
    const [uiLanguage, setUiLanguage] = useState(i18n.language);
    const [isFavoriteDialogOpen, setIsFavoriteDialogOpen] = useState(false);

    // UI言語変更を監視してstate更新
    useEffect(() => {
      const handleLanguageChange = (lang: string) => {
        console.log('[BlocklyEditor] UI language changed to:', lang);

        // Guard (BUG-038): i18n は duplicate 'languageChanged' event を発火することがある。
        // 典型例: ログイン時の preferred_lang 再適用 (SP3)。lang === uiLanguage だと
        // 下の setUiLanguage(lang) が React の bail-out で no-op になり、
        // 主 useEffect (workspace rebuild + languageChangeSavedRef リセット) が再 fire されない。
        // 結果: languageChangeSavedRef.current が true に stuck → changeListener が
        // 永続的に handleWorkspaceChange() を skip → generateCode() 呼ばれず
        // generatedCode state が empty のまま → コンパイル時「コードがありません」alert。
        if (lang === uiLanguage) {
          console.log('[BlocklyEditor] Language unchanged, skipping save/flag set (BUG-038 guard)');
          return;
        }

        // 重要: 言語変更前に現在のワークスペースのXMLを保存
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Blockly workspace の internal disposal flag は public 型に未収録
        if (workspaceRef.current && !(workspaceRef.current as any).isDisposed) {
          const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
          const xmlText = Blockly.Xml.domToText(xml);
          savedXmlRef.current = xmlText;
          languageChangeSavedRef.current = true; // フラグを設定してcleanupでの上書きを防ぐ
          console.log('[BlocklyEditor] Language change: Saved XML, blocks:', workspaceRef.current.getAllBlocks(false).length);
        }

        setUiLanguage(lang);
      };

      i18n.on('languageChanged', handleLanguageChange);
      return () => i18n.off('languageChanged', handleLanguageChange);
    }, [i18n, uiLanguage]);

    // Arduino C++専用（ロボットモードに応じたツールボックスを使用）
    const currentToolbox = toolboxXml || generateToolbox(robotMode, favorites, selectedBoard);
    const currentGenerator = javascriptGenerator;

    // ワークスペースからXMLを取得
    const getWorkspaceXml = useCallback(() => {
      if (!workspaceRef.current) return '<xml></xml>';
      const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
      return Blockly.Xml.domToText(xml);
    }, []);

    // ワークスペースからコードを生成
    const generateCode = useCallback(() => {
      if (!workspaceRef.current) return '';
      try {
        // Arduino C++用のdefinitions_とsetups_を初期化（毎回リセット）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gen = currentGenerator as any;
        gen.definitions_ = {};
        gen.setups_ = {};
        // loopPre_: counterpart to setups_, but for void loop() { ... }.
        // Block generators register dedupable lines (e.g. `bleLoopTick();`) by
        // key, and we inject all values immediately after `void loop() {`.
        // Handler-style blocks (ble_uart_on_receive, ble_on_write,
        // ble_on_device_found, websocket_on_message) used to each emit their
        // own tick call inline at their placement site; with N handlers in a
        // single program that resulted in N redundant `bleLoopTick();` lines
        // and made the loop body's order sensitive to handler block placement.
        // loopPre_ centralizes the call and dedupes by key.
        gen.loopPre_ = {};

        let code = currentGenerator.workspaceToCode(workspaceRef.current);

        // setups_の内容をvoid setup()に挿入
        if (gen.setups_ && Object.keys(gen.setups_).length > 0) {
          const setupsCode = Object.values(gen.setups_).join('\n');
          // void setup() { の直後に挿入
          code = code.replace(
            /void setup\(\) \{\n/,
            `void setup() {\n${setupsCode}\n`
          );
        }

        // loopPre_ の内容を void loop() に挿入
        if (gen.loopPre_ && Object.keys(gen.loopPre_).length > 0) {
          const loopPreCode = Object.values(gen.loopPre_).join('\n');
          code = code.replace(
            /void loop\(\) \{\n/,
            `void loop() {\n${loopPreCode}\n`
          );
        }

        return code;
      } catch (error) {
        console.error('Code generation error:', error);
        return '// コード生成エラー';
      }
    }, [currentGenerator]);

    // ワークスペース変更ハンドラ
    const handleWorkspaceChange = useCallback(() => {
      if (onWorkspaceChange) {
        const xml = getWorkspaceXml();
        const code = generateCode();
        onWorkspaceChange(xml, code);
      }
    }, [onWorkspaceChange, getWorkspaceXml, generateCode]);

    // XMLをワークスペースに読み込み
    const loadXml = useCallback((xml: string) => {
      if (!workspaceRef.current) return;
      try {
        workspaceRef.current.clear();
        if (xml && xml !== '<xml></xml>') {
          const dom = Blockly.utils.xml.textToDom(xml);
          Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
          savedXmlRef.current = xml;
        }
      } catch (e) {
        console.error('Failed to load XML:', e);
      }
    }, []);

    // ブロックをワークスペースに追加（既存のブロックは保持）
    const appendBlocks = useCallback((xml: string) => {
      console.log('[BlocklyEditor] appendBlocks called');
      console.log('[BlocklyEditor] XML to append:', xml);
      console.log('[BlocklyEditor] workspaceRef.current exists:', !!workspaceRef.current);

      if (!workspaceRef.current) {
        console.error('[BlocklyEditor] workspaceRef.current is null!');
        return;
      }

      try {
        if (xml && xml !== '<xml></xml>') {
          console.log('[BlocklyEditor] Converting XML to DOM...');
          const dom = Blockly.utils.xml.textToDom(xml);
          console.log('[BlocklyEditor] DOM created, appending to workspace...');

          // Blockly.Xml.domToWorkspaceは既存のブロックを残したまま追加する
          Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
          console.log('[BlocklyEditor] Blocks appended to workspace');

          // 追加されたブロックを少しずらして表示（重ならないように）
          const allBlocks = workspaceRef.current.getAllBlocks(false);
          console.log('[BlocklyEditor] Total blocks after append:', allBlocks.length);

          const newBlocks = allBlocks.slice(-1); // 最後に追加されたブロック
          if (newBlocks.length > 0) {
            const block = newBlocks[0];
            console.log('[BlocklyEditor] Moving last block by (20, 20)');
            // 右下に少しずらす
            block.moveBy(20, 20);
          }

          // ワークスペース変更を通知
          console.log('[BlocklyEditor] Calling handleWorkspaceChange...');
          handleWorkspaceChange();
          console.log('[BlocklyEditor] appendBlocks completed successfully');
        } else {
          console.warn('[BlocklyEditor] XML is empty or default, skipping append');
        }
      } catch (e) {
        console.error('[BlocklyEditor] Failed to append blocks:', e);
      }
    }, [handleWorkspaceChange]);

    const setReadOnly = useCallback((readOnly: boolean) => {
      const ws = workspaceRef.current;
      if (!ws) return;
      // Blockly の options.readOnly は初期化後に変更できないため、
      // 全ブロックの movable/editable/deletable を制御する
      ws.getAllBlocks(false).forEach((block) => {
        block.setMovable(!readOnly);
        block.setEditable(!readOnly);
        block.setDeletable(!readOnly);
      });
      // ツールボックスの表示/非表示で新規ブロック追加を防止
      if (readOnly) {
        ws.getToolbox()?.setVisible(false);
      } else {
        ws.getToolbox()?.setVisible(true);
      }
      // ツールボックスの表示状態変更に合わせて workspace の SVG サイズを再計算
      Blockly.svgResize(ws);
    }, []);

    // ブロック全体を画面中央に配置し直す（読み取り専用ビューアで使用）
    // loadXml + setReadOnly 後に呼ぶと、ツールボックス非表示後の領域に合わせて
    // 中央にスクロールされる
    const centerView = useCallback(() => {
      const ws = workspaceRef.current;
      if (!ws) return;
      // svgResize でメトリクスを確実に更新してから scrollCenter
      Blockly.svgResize(ws);
      ws.scrollCenter();
    }, []);

    // refを通じてメソッドを公開
    useImperativeHandle(ref, () => ({
      loadXml,
      appendBlocks,
      setReadOnly,
      centerView,
    }), [loadXml, appendBlocks, setReadOnly, centerView]);

    // Blocklyワークスペースの初期化
    // 言語が変わったらワークスペース全体を再構築
    useEffect(() => {
      if (!blocklyDiv.current) return;

      console.error('📦 [BlocklyEditor] Step 1: Rebuilding workspace for uiLanguage:', uiLanguage);

      // i18nの現在言語に応じてBlocklyロケールを設定（BUG-039: 5 言語対応）
      const locale =
        uiLanguage === 'ja' ? Ja :
        uiLanguage === 'es' ? Es :
        uiLanguage === 'pt-PT' ? Pt :
        uiLanguage === 'zh-TW' ? ZhHant :
        En;
      console.error('📦 [BlocklyEditor] Step 2: Before setLocale, Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INIT:', Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INIT);
      Blockly.setLocale(locale);
      console.error('📦 [BlocklyEditor] Step 3: After setLocale, Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INIT:', Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INIT);

      // Blockly.Msg.*を更新（setLocaleの後に実行して上書きを防ぐ）
      console.error('📦 [BlocklyEditor] Step 4: Calling populateBlocklyMessages...');
      populateBlocklyMessages(uiLanguage);
      console.error('📦 [BlocklyEditor] Step 5: After populateBlocklyMessages, Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INIT:', Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INIT);

      const blocklyOptions: Blockly.BlocklyOptions = {
        toolbox: currentToolbox,
        theme: digiCodeDarkTheme,
        grid: {
          spacing: 20,
          length: 3,
          colour: '#2a2a2a',
          snap: true,
        },
        zoom: {
          controls: true,
          wheel: true,
          pinch: true,
          startScale: 0.85,
          maxScale: 3,
          minScale: 0.2,
          scaleSpeed: 1.2,
        },
        trashcan: true,
        move: {
          scrollbars: {
            horizontal: true,
            vertical: true,
          },
          drag: true,
          wheel: true,
        },
        renderer: 'zelos',
        sounds: false,
        horizontalLayout: false,
        toolboxPosition: 'start',
      };

      // ワークスペース作成
      const workspace = Blockly.inject(blocklyDiv.current, blocklyOptions);

      workspaceRef.current = workspace;

      // 初期状態でフライアウトを閉じる（カテゴリ未選択状態にする）
      setTimeout(() => {
        const toolbox = workspace.getToolbox();
        if (toolbox && typeof toolbox.clearSelection === 'function') {
          toolbox.clearSelection();
        }
      }, 100);

      // お気に入りモードの場合、カテゴリクリックイベントをリスン
      let domClickHandler: ((e: Event) => void) | null = null;
      let toolboxElement: Element | null = null;

      if (robotMode === 'custom') {
        console.log('[Favorites] Setting up event listener for custom mode');

        // Blockly changeイベントでのリスン
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Blockly ToolboxItemSelect event shape (newItem.getName()) は public 型に未収録
        const handleToolboxItemSelect = (event: any) => {
          // イベントからカテゴリ名を取得（newItemプロパティを持つイベントのみ処理）
          if (event.newItem && typeof event.newItem.getName === 'function') {
            const categoryName = event.newItem.getName();
            console.log('[Favorites] Category selected:', categoryName);

            // "お気に入り設定"カテゴリがクリックされたらダイアログを開く
            if (categoryName && categoryName.includes('お気に入り設定')) {
              console.log('[Favorites] Opening favorites dialog');
              setIsFavoriteDialogOpen(true);

              // ツールボックスの選択をクリア（フライアウトを閉じる）
              setTimeout(() => {
                const toolbox = workspace.getToolbox();
                if (toolbox && typeof toolbox.clearSelection === 'function') {
                  toolbox.clearSelection();
                }
              }, 100);
            }
          }
        };

        workspace.addChangeListener(handleToolboxItemSelect);

        // DOMイベントでも監視（フォールバック）
        setTimeout(() => {
          toolboxElement = blocklyDiv.current?.querySelector('.blocklyToolboxDiv') || null;
          if (toolboxElement) {
            console.log('[Favorites] Adding DOM click listener to toolbox');
            domClickHandler = (e: Event) => {
              const target = e.target as HTMLElement;
              const categoryElement = target.closest('.blocklyTreeRow');
              if (categoryElement) {
                const labelElement = categoryElement.querySelector('.blocklyTreeLabel');
                if (labelElement) {
                  const categoryName = labelElement.textContent || '';
                  console.log('[Favorites] DOM click on category:', categoryName);
                  if (categoryName.includes('お気に入り設定')) {
                    console.log('[Favorites] Opening favorites dialog via DOM');
                    setIsFavoriteDialogOpen(true);
                    setTimeout(() => {
                      const toolbox = workspace.getToolbox();
                      if (toolbox && typeof toolbox.clearSelection === 'function') {
                        toolbox.clearSelection();
                      }
                    }, 100);
                  }
                }
              }
            };
            toolboxElement.addEventListener('click', domClickHandler);
          }
        }, 500);
      }

      // 保存されたXMLを読み込み（初回はinitialXml、言語切り替え時は保存されたXML）
      console.log('[BlocklyEditor] savedXmlRef.current:', savedXmlRef.current ? savedXmlRef.current.substring(0, 100) : 'empty');

      // デバッグ: ブロック定義の確認
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Blockly.Blocks の BlockDefinition 型は internal、toString() 経由の debug 目的のため cast
      const stepperDef = (Blockly.Blocks as any)['stepper_init'];
      console.error('🔍 [BlocklyEditor] BEFORE RESTORE - stepper_init definition exists:', !!stepperDef);
      console.error('🔍 [BlocklyEditor] BEFORE RESTORE - Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INIT:', Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INIT);

      // init関数の中身を確認
      if (stepperDef && stepperDef.init) {
        console.error('🔍 [BlocklyEditor] stepper_init.init function:', stepperDef.init.toString().substring(0, 300));
      }

      if (savedXmlRef.current && savedXmlRef.current !== '<xml></xml>' && savedXmlRef.current !== '<xml xmlns="https://developers.google.com/blockly/xml"></xml>') {
        try {
          console.log('[BlocklyEditor] Restoring workspace from XML...');
          const xml = Blockly.utils.xml.textToDom(savedXmlRef.current);
          Blockly.Xml.domToWorkspace(xml, workspace);
          console.log('[BlocklyEditor] Workspace restored, block count:', workspace.getAllBlocks(false).length);
        } catch (e) {
          console.error('Failed to load workspace XML:', e);
        }
      } else {
        console.log('[BlocklyEditor] No saved XML to restore, skipping');
      }

      // ワークスペース復元完了後、言語変更フラグをリセット
      if (languageChangeSavedRef.current) {
        languageChangeSavedRef.current = false;
        console.log('[BlocklyEditor] Language change flag reset after workspace restore');
      }

      // 変更イベントリスナー（ワークスペース変更時にXMLを自動保存）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Blockly.Events.Abstract の subtype (Create/Delete) は event.type 動的判定で使用、public 型の union が狭すぎるため cast
      const changeListener = (event: any) => {
        // 言語変更中は保存しない（disposeでイベントが発火して空XMLで上書きされるのを防ぐ）
        if (languageChangeSavedRef.current) {
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Blockly workspace の internal disposal flag は public 型に未収録
        if (workspaceRef.current && !(workspaceRef.current as any).isDisposed) {
          const xml = Blockly.Xml.workspaceToDom(workspaceRef.current);
          const xmlText = Blockly.Xml.domToText(xml);
          savedXmlRef.current = xmlText;
          // Debug: Log when blocks are added/removed
          if (event.type === 'create' || event.type === 'delete') {
            console.log('[BlocklyEditor] XML saved, blocks:', workspaceRef.current.getAllBlocks(false).length);
          }
        }
        handleWorkspaceChange();
      };

      workspace.addChangeListener(changeListener);

      // 初回コード生成
      handleWorkspaceChange();

      // クリーンアップ
      return () => {
        // 言語変更ハンドラで既に保存済みの場合はスキップ（フラグはworkspace復元後にリセット）
        if (languageChangeSavedRef.current) {
          console.log('[BlocklyEditor] Cleanup: Skipping XML save (already saved by language change handler)');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Blockly workspace の internal disposal flag は public 型に未収録
        } else if (workspace && !(workspace as any).isDisposed) {
          const blockCount = workspace.getAllBlocks(false).length;
          // ブロックが存在する場合のみ保存（React Strict Modeの2回目cleanup対策）
          if (blockCount > 0) {
            const xml = Blockly.Xml.workspaceToDom(workspace);
            const xmlText = Blockly.Xml.domToText(xml);
            savedXmlRef.current = xmlText;
            console.log('[BlocklyEditor] Cleanup: Saved XML before dispose, blocks:', blockCount);
          } else {
            console.log('[BlocklyEditor] Cleanup: Skipping save (empty workspace)');
          }
        }
        // DOMイベントリスナーを削除
        if (domClickHandler && toolboxElement) {
          console.log('[Favorites] Removing DOM click listener');
          toolboxElement.removeEventListener('click', domClickHandler);
        }
        workspace.removeChangeListener(changeListener);
        workspace.dispose();
        workspaceRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentToolbox, robotMode, uiLanguage]);

    // リサイズ対応
    useEffect(() => {
      const handleResize = () => {
        if (workspaceRef.current) {
          Blockly.svgResize(workspaceRef.current);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
      <>
        <div
          ref={blocklyDiv}
          className="w-full h-full touch-manipulation"
          style={{ minHeight: '400px' }}
        />
        <FavoriteSettingsDialog
          open={isFavoriteDialogOpen}
          onOpenChange={setIsFavoriteDialogOpen}
        />
      </>
    );
  }
);

BlocklyEditor.displayName = 'BlocklyEditor';
