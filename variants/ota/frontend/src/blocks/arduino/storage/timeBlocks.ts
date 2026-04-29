/**
 * 時刻ブロック (BP3-1/BP3-2, 2026-04-20)
 *
 * ntp_*: ESP32 configTime 標準API / RP2040 NTPClient ライブラリ分岐
 *        WiFi 非対応ボードでは ntp_time カテゴリ自体を非表示（supportsWifi フィルタ）
 * rtc_*: RTClib（Adafruit）— DS3231 / DS1307 対応
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const NTP_COLOR = '#3F51B5';
const RTC_COLOR = '#9C27B0';

// ===== NTP 時刻同期 (BP3-1) =====

/**
 * ntp_sync - NTP サーバーで時刻同期
 * ESP32: configTime() 標準API
 * RP2040: NTPClient ライブラリ
 */
Blockly.Blocks['ntp_sync'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏰ ' + (Blockly.Msg.BLOCKS_NTP_SYNC || 'NTP Sync'))
        .appendField(Blockly.Msg.BLOCKS_NTP_SERVER || 'server')
        .appendField(new Blockly.FieldTextInput('pool.ntp.org'), 'SERVER');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NTP_TIMEZONE || 'timezone offset (sec)')
        .appendField(new Blockly.FieldNumber(32400, -86400, 86400), 'TZ_OFFSET');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NTP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NTP_SYNCTOOLTIP || 'Synchronize time from NTP server. Timezone offset in seconds (JST=32400, UTC=0). Requires WiFi connection.');
  }
};

generator.forBlock['ntp_sync'] = function(block: Blockly.Block) {
  const server = block.getFieldValue('SERVER');
  const tzOffset = block.getFieldValue('TZ_OFFSET');
  generator.definitions_['include_ntp'] = `
#if defined(ESP32)
#include <time.h>
#else
#include <WiFiUdp.h>
#include <NTPClient.h>
WiFiUDP ntpUDP;
NTPClient ntpClient(ntpUDP, "${server}", ${tzOffset}, 60000);
#endif`;
  return `#if defined(ESP32)\n  configTime(${tzOffset}, 0, "${server}");\n#else\n  ntpClient.begin();\n  ntpClient.update();\n#endif\n`;
};

/**
 * ntp_get_unix_time - UNIX タイムスタンプ取得
 */
Blockly.Blocks['ntp_get_unix_time'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏰ ' + (Blockly.Msg.BLOCKS_NTP_UNIXTIME || 'Get Unix Time'));
    this.setOutput(true, 'Number');
    this.setColour(NTP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NTP_UNIXTIMETOOLTIP || 'Get current Unix timestamp (seconds since 1970-01-01). Returns 0 if not synchronized.');
  }
};

generator.forBlock['ntp_get_unix_time'] = function() {
  return [
    '#if defined(ESP32)\n(unsigned long)time(nullptr)\n#else\nntpClient.getEpochTime()\n#endif',
    0
  ];
};

/**
 * ntp_get_formatted - フォーマット済み時刻文字列取得
 * ESP32: strftime を使った柔軟なフォーマット
 * RP2040: NTPClient の getFormattedTime()
 */
Blockly.Blocks['ntp_get_formatted'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏰ ' + (Blockly.Msg.BLOCKS_NTP_FORMATTED || 'Get Formatted Time'))
        .appendField(Blockly.Msg.BLOCKS_NTP_FORMAT || 'format')
        .appendField(new Blockly.FieldTextInput('%Y-%m-%d %H:%M:%S'), 'FORMAT');
    this.setOutput(true, 'String');
    this.setColour(NTP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NTP_FORMATTEDTOOLTIP || 'Get current time as a formatted string. Format: %Y=year, %m=month, %d=day, %H=hour, %M=minute, %S=second.');
  }
};

generator.forBlock['ntp_get_formatted'] = function(block: Blockly.Block) {
  const format = block.getFieldValue('FORMAT');
  generator.definitions_['ntp_format_func'] = `
String getFormattedTime(const char* fmt) {
#if defined(ESP32)
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)) return "N/A";
  char buf[64];
  strftime(buf, sizeof(buf), fmt, &timeinfo);
  return String(buf);
#else
  return ntpClient.getFormattedTime();
#endif
}`;
  return [`getFormattedTime("${format}")`, 0];
};

/**
 * ntp_get_component - 時刻の個別コンポーネント取得（年/月/日/時/分/秒）
 */
Blockly.Blocks['ntp_get_component'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏰ ' + (Blockly.Msg.BLOCKS_NTP_COMPONENT || 'Get Time Component'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_NTP_YEAR || 'year', 'year'],
          [Blockly.Msg.BLOCKS_NTP_MONTH || 'month', 'month'],
          [Blockly.Msg.BLOCKS_NTP_DAY || 'day', 'day'],
          [Blockly.Msg.BLOCKS_NTP_HOUR || 'hour', 'hour'],
          [Blockly.Msg.BLOCKS_NTP_MINUTE || 'minute', 'minute'],
          [Blockly.Msg.BLOCKS_NTP_SECOND || 'second', 'second'],
        ]), 'COMPONENT');
    this.setOutput(true, 'Number');
    this.setColour(NTP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NTP_COMPONENTTOOLTIP || 'Get a specific component of the current time (year, month, day, hour, minute, or second).');
  }
};

generator.forBlock['ntp_get_component'] = function(block: Blockly.Block) {
  const component = block.getFieldValue('COMPONENT');
  const componentMap: Record<string, string> = {
    year: 'tm_year + 1900',
    month: 'tm_mon + 1',
    day: 'tm_mday',
    hour: 'tm_hour',
    minute: 'tm_min',
    second: 'tm_sec',
  };
  const ntpMap: Record<string, string> = {
    year: 'ntpClient.getEpochTime()', // RP2040 では struct tm で同様に取得
    month: 'ntpClient.getEpochTime()',
    day: 'ntpClient.getEpochTime()',
    hour: 'ntpClient.getHours()',
    minute: 'ntpClient.getMinutes()',
    second: 'ntpClient.getSeconds()',
  };
  const tmField = componentMap[component] || 'tm_hour';
  const ntpExpr = ntpMap[component] || 'ntpClient.getHours()';

  if (['year', 'month', 'day'].includes(component)) {
    generator.definitions_['ntp_component_func'] = `
int getTimeComponent(const char* comp) {
#if defined(ESP32)
  struct tm t; if(!getLocalTime(&t)) return 0;
  if(strcmp(comp,"year")==0) return t.tm_year+1900;
  if(strcmp(comp,"month")==0) return t.tm_mon+1;
  return t.tm_mday;
#else
  time_t e = ntpClient.getEpochTime(); struct tm* t = localtime(&e);
  if(strcmp(comp,"year")==0) return t->tm_year+1900;
  if(strcmp(comp,"month")==0) return t->tm_mon+1;
  return t->tm_mday;
#endif
}`;
    return [`getTimeComponent("${component}")`, 0];
  }

  return [
    `(int)(` +
    `#if defined(ESP32)\n([&](){ struct tm t; getLocalTime(&t); return t.${tmField}; })()\n` +
    `#else\n${ntpExpr}\n#endif\n)`,
    0
  ];
};

// ===== RTC (BP3-2) =====

/**
 * rtc_init - RTC 初期化（DS3231 / DS1307）
 */
Blockly.Blocks['rtc_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🕰️ ' + (Blockly.Msg.BLOCKS_RTC_INIT || 'RTC Init'))
        .appendField(new Blockly.FieldDropdown([
          ['DS3231', 'DS3231'],
          ['DS1307', 'DS1307'],
        ]), 'MODEL');
    this.setOutput(true, 'Boolean');
    this.setColour(RTC_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RTC_INITTOOLTIP || 'Initialize RTC module (DS3231 or DS1307) via I2C. Returns true if found. Requires RTClib library.');
  }
};

generator.forBlock['rtc_init'] = function(block: Blockly.Block) {
  const model = block.getFieldValue('MODEL');
  generator.definitions_['include_rtc'] = '#include <RTClib.h>';
  generator.definitions_[`rtc_instance_${model}`] = `RTC_${model} rtc;`;
  return [`rtc.begin()`, 0];
};

/**
 * rtc_set_time - RTC 時刻設定
 */
Blockly.Blocks['rtc_set_time'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🕰️ ' + (Blockly.Msg.BLOCKS_RTC_SETTIME || 'RTC Set Time'));
    this.appendValueInput('YEAR').setCheck('Number').appendField(Blockly.Msg.BLOCKS_RTC_YEAR || 'year');
    this.appendValueInput('MONTH').setCheck('Number').appendField(Blockly.Msg.BLOCKS_RTC_MONTH || 'month');
    this.appendValueInput('DAY').setCheck('Number').appendField(Blockly.Msg.BLOCKS_RTC_DAY || 'day');
    this.appendValueInput('HOUR').setCheck('Number').appendField(Blockly.Msg.BLOCKS_RTC_HOUR || 'hour');
    this.appendValueInput('MINUTE').setCheck('Number').appendField(Blockly.Msg.BLOCKS_RTC_MINUTE || 'minute');
    this.appendValueInput('SECOND').setCheck('Number').appendField(Blockly.Msg.BLOCKS_RTC_SECOND || 'second');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(RTC_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RTC_SETTIMETOOLTIP || 'Set the RTC date and time.');
  }
};

generator.forBlock['rtc_set_time'] = function(block: Blockly.Block) {
  const year = javascriptGenerator.valueToCode(block, 'YEAR', 0) || '2024';
  const month = javascriptGenerator.valueToCode(block, 'MONTH', 0) || '1';
  const day = javascriptGenerator.valueToCode(block, 'DAY', 0) || '1';
  const hour = javascriptGenerator.valueToCode(block, 'HOUR', 0) || '0';
  const minute = javascriptGenerator.valueToCode(block, 'MINUTE', 0) || '0';
  const second = javascriptGenerator.valueToCode(block, 'SECOND', 0) || '0';
  generator.definitions_['include_rtc'] = '#include <RTClib.h>';
  return `  rtc.adjust(DateTime(${year}, ${month}, ${day}, ${hour}, ${minute}, ${second}));\n`;
};

/**
 * rtc_get_component - RTC から時刻コンポーネント取得
 */
Blockly.Blocks['rtc_get_component'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🕰️ ' + (Blockly.Msg.BLOCKS_RTC_GETCOMPONENT || 'RTC Get'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_RTC_YEAR || 'year', 'year'],
          [Blockly.Msg.BLOCKS_RTC_MONTH || 'month', 'month'],
          [Blockly.Msg.BLOCKS_RTC_DAY || 'day', 'day'],
          [Blockly.Msg.BLOCKS_RTC_HOUR || 'hour', 'hour'],
          [Blockly.Msg.BLOCKS_RTC_MINUTE || 'minute', 'minute'],
          [Blockly.Msg.BLOCKS_RTC_SECOND || 'second', 'second'],
          [Blockly.Msg.BLOCKS_RTC_UNIXTIME || 'unix time', 'unixtime'],
        ]), 'COMPONENT');
    this.setOutput(true, 'Number');
    this.setColour(RTC_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RTC_GETCOMPONENTTOOLTIP || 'Get a time component from the RTC module.');
  }
};

generator.forBlock['rtc_get_component'] = function(block: Blockly.Block) {
  const component = block.getFieldValue('COMPONENT');
  const methodMap: Record<string, string> = {
    year: 'year()',
    month: 'month()',
    day: 'day()',
    hour: 'hour()',
    minute: 'minute()',
    second: 'second()',
    unixtime: 'unixtime()',
  };
  generator.definitions_['include_rtc'] = '#include <RTClib.h>';
  const method = methodMap[component] || 'hour()';
  return [`rtc.now().${method}`, 0];
};

/**
 * rtc_get_formatted - RTC フォーマット済み時刻文字列
 */
Blockly.Blocks['rtc_get_formatted'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🕰️ ' + (Blockly.Msg.BLOCKS_RTC_FORMATTED || 'RTC Formatted Time'));
    this.setOutput(true, 'String');
    this.setColour(RTC_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RTC_FORMATTEDTOOLTIP || 'Get RTC time as "YYYY-MM-DD HH:MM:SS" formatted string.');
  }
};

generator.forBlock['rtc_get_formatted'] = function() {
  generator.definitions_['include_rtc'] = '#include <RTClib.h>';
  generator.definitions_['rtc_format_func'] = `
String rtcGetFormatted() {
  DateTime now = rtc.now();
  char buf[20];
  sprintf(buf, "%04d-%02d-%02d %02d:%02d:%02d",
    now.year(), now.month(), now.day(),
    now.hour(), now.minute(), now.second());
  return String(buf);
}`;
  return [`rtcGetFormatted()`, 0];
};

console.log('Time (NTP/RTC) blocks loaded');
