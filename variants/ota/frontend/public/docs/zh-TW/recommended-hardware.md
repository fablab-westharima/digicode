# 推薦硬體清單

DigiCode 已驗證裝置清單。建議從可信賴的零售商購買以確保穩定運作。

## 重要注意事項

> **關於廉價仿製品/克隆品**
>
> 在 AliExpress、Wish、Temu 等販售的廉價克隆品已報告以下問題：
> - 不同的腳位配置
> - 電壓/電流規格與標示不同
> - 不同的驅動 IC（不相容）
> - 品質差異大
>
> 我們無法為這些產品提供支援，請從推薦的零售商購買。

---

## 推薦零售商

| 零售商 | 特色 | URL |
|--------|------|-----|
| **Akizuki Denshi** | 老牌電子零件店，選擇豐富 | https://akizukidenshi.com/ |
| **Switch Science** | 針對 Maker，日文文件 | https://www.switch-science.com/ |
| **Sengoku Densho** | 秋葉原店舖，可現場購買 | https://www.sengoku.co.jp/ |
| **Marutsu Online** | 企業支援，品質保證 | https://www.marutsu.co.jp/ |
| **DigiKey** | 授權國際經銷商 | https://www.digikey.jp/ |
| **Mouser** | 授權國際經銷商 | https://www.mouser.jp/ |

---

## ESP32 開發板

| 產品 | 價格（約） | 備註 | 連結 |
|------|----------|------|------|
| **ESP32 NodeMCU（含擴展板）** | ¥1,782 | **最推薦**。DC 插孔（6.5-16V）適合電子專案 | [Switch Science](https://www.switch-science.com/products/9667) |
| **ESP32-DevKitC-32E** | ¥1,480~ | 標準開發板。TELEC 認證 | [Akizuki](https://akizukidenshi.com/catalog/g/g115673/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-32E/12091810) / [Mouser](https://www.mouser.jp/ProductDetail/Espressif-Systems/ESP32-DevKitC-32E?qs=GedFDFLaBXFpgD0kAZWDrQ%3D%3D) |
| **ESP32-DevKitC-VE** | ¥1,770~ | 8MB Flash/RAM，容量更大 | [Akizuki](https://akizukidenshi.com/catalog/g/g115674/) / [DigiKey](https://www.digikey.jp/ja/products/detail/espressif-systems/ESP32-DEVKITC-VE/12091812) / [Mouser](https://www.mouser.jp/ProductDetail/Espressif-Systems/ESP32-DevKitC-VE?qs=vmHwEFxEFR%2BnPxzX%2FBK62A%3D%3D) |
| **ESPr Developer 32** | ¥2,200 | 日本設計，TELEC 認證 | [Switch Science](https://www.switch-science.com/products/3210) |

### 不推薦的開發板

| 產品 | 原因 |
|------|------|
| NodeMCU-32S（廉價版） | 可能有不同的腳位配置 |
| ESP32-CAM（OV2640） | 腳位少，不適合伺服控制 |
| ESP32-S2 | GPIO 配置不同，部分功能不支援 |
| ESP32-C3 | ADC/觸控感測器規格不同 |

---

## 伺服馬達

### 推薦伺服（180度）

| 產品 | 價格（約） | 用途 | 連結 |
|------|----------|------|------|
| **SG90** | ¥440 | OTTO 標準，輕負載 | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| **MG90S** | ¥1,240 | 金屬齒輪，中負載 | [Akizuki](https://akizukidenshi.com/catalog/g/g113227/) |
| **SG92R** | ¥700 | 高扭力 | [Akizuki](https://akizukidenshi.com/catalog/g/g108914/) |
| **MG996R** | ¥1,480 | 高扭力，大型機器人 | [Akizuki](https://akizukidenshi.com/catalog/g/g112534/) |

### 推薦伺服（連續旋轉/360度）

| 產品 | 價格（約） | 用途 | 連結 |
|------|----------|------|------|
| **FS90R** | ¥500 | 連續旋轉，OTTO Wheel | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |

### 伺服電源注意事項

```
⚠️ 重要電源資訊
- USB 供電（500mA）下伺服不穩定
- 多個伺服需要外部電源（5V/2A+）
- 無法從 ESP32 的 3.3V 腳位供電給伺服（需要 5V）
```

---

## 超音波感測器

| 產品 | 價格（約） | 用途 | 連結 |
|------|----------|------|------|
| **HC-SR04** | ¥300~ | 標準超音波感測器 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) / [Switch Science](https://www.switch-science.com/products/6080) / [Mouser](https://www.mouser.jp/ProductDetail/OSEPP-Electronics/HC-SR04?qs=wNBL%252BABd93PqZEhuhHkuOw%3D%3D) |

### HC-SR04 注意事項

```
⚠️ 電壓等級警告
- HC-SR04 工作電壓 5V，ESP32 為 3.3V
- Echo 腳位可能輸出 5V
- 建議使用分壓電路（1kΩ + 2kΩ）
```

---

## 溫濕度感測器

| 產品 | 價格（約） | 精度 | 連結 |
|------|----------|------|------|
| **DHT11** | ¥550 | 溫度 ±2°C，濕度 ±5% | [Akizuki](https://akizukidenshi.com/catalog/g/g107003/) |
| **DHT22（AM2302）** | ¥1,160 | 溫度 ±0.5°C，濕度 ±2% | [Akizuki](https://akizukidenshi.com/catalog/g/g107002/) |
| **SHT31 模組** | ¥1,280 | 高精度 I2C | [Akizuki](https://akizukidenshi.com/catalog/g/g112125/) / [Switch Science](https://www.switch-science.com/products/2853) |
| **BME280 模組** | ¥1,380~ | 溫度+濕度+氣壓 | [Akizuki](https://akizukidenshi.com/catalog/g/g109421/) / [Switch Science](https://www.switch-science.com/products/2236) |

---

## 顯示器（OLED）

| 產品 | 尺寸 | 價格（約） | 連結 |
|------|------|----------|------|
| **0.96" OLED（白色）** | 128x64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g112031/) |
| **0.96" OLED（藍色）** | 128x64 | ¥580 | [Akizuki](https://akizukidenshi.com/catalog/g/g115870/) |
| **Grove 0.96" OLED** | 128x64 | ¥1,247 | [Switch Science](https://www.switch-science.com/products/7002) |

---

## NeoPixel（WS2812B）

| 產品 | LED 數量 | 價格（約） | 連結 |
|------|---------|----------|------|
| **NeoPixel Ring 12LED** | 12 | ¥1,078 | [Switch Science](https://www.switch-science.com/products/1593) |
| **NeoPixel Ring 16LED** | 16 | ¥1,287 | [Switch Science](https://www.switch-science.com/products/1537) |
| **WS2812B 8LED Stick** | 8 | ¥350 | [Akizuki](https://akizukidenshi.com/catalog/g/g114307/) |
| **WS2812B 模組（單顆）** | 1 | ¥70 | [Akizuki](https://akizukidenshi.com/catalog/g/g108414/) |

### 電源注意事項

```
⚠️ 電流消耗
- 每顆 LED 最大 60mA（白色全亮）
- 8 顆 LED = 最大 480mA
- 16 顆 LED = 最大 960mA
- 使用多顆 LED 需要外部電源（5V）
```

---

## 馬達驅動器

| 產品 | 電流規格 | 價格（約） | 連結 |
|------|---------|----------|------|
| **L298N 2A 雙馬達控制器** | 2A/通道 | ¥2,180 | [Akizuki](https://akizukidenshi.com/catalog/g/g106680/) |
| **DRV8835 馬達驅動模組** | 1.2A/通道 | ¥550 | [Akizuki](https://akizukidenshi.com/catalog/g/g109848/) |
| **TB6612FNG 雙直流馬達驅動套件** | 1.2A/通道 | ¥450 | [Akizuki](https://akizukidenshi.com/catalog/g/g111219/) / [Switch Science](https://www.switch-science.com/products/236) |

---

## 蜂鳴器與喇叭

| 產品 | 類型 | 價格（約） | 連結 |
|------|------|----------|------|
| **壓電喇叭** | 被動式 | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |

**DigiCode 推薦「被動式蜂鳴器」**（支援旋律播放）

---

## OTTO 機器人零件

### 推薦配置（OTTO 雙足）

| 零件 | 推薦產品 | 數量 | 單價 | 連結 |
|------|---------|------|------|------|
| ESP32 開發板 | ESP32 NodeMCU（含擴展板） | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| 伺服 | SG90 | 4 | ¥440 | [Akizuki](https://akizukidenshi.com/catalog/g/g108761/) |
| 超音波感測器 | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| 蜂鳴器 | 壓電喇叭 | 1 | ¥40 | [Akizuki](https://akizukidenshi.com/catalog/g/g104118/) |
| **合計** | | | **¥3,882** | |

### 推薦配置（OTTO Wheel）

| 零件 | 推薦產品 | 數量 | 單價 | 連結 |
|------|---------|------|------|------|
| ESP32 開發板 | ESP32 NodeMCU（含擴展板） | 1 | ¥1,782 | [Switch Science](https://www.switch-science.com/products/9667) |
| 連續旋轉伺服 | FS90R | 2 | ¥500 | [Akizuki](https://akizukidenshi.com/catalog/g/g113206/) |
| 超音波感測器 | HC-SR04 | 1 | ¥300 | [Akizuki](https://akizukidenshi.com/catalog/g/g111009/) |
| **合計** | | | **¥3,082** | |

---

## 相關文件

- [硬體連接指南](./hardware-setup.md)
- [故障排除](./troubleshooting.md)
- [開始使用](./getting-started.md)
