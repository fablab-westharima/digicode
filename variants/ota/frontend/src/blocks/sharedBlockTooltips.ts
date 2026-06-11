/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * Shared block tooltip helpers (Session 165 T4-1).
 *
 * i18n: Uses Blockly.Msg.* (English fallback) per the project block-i18n
 * convention (audit-i18n-block-coverage.ts Mode A).
 */
import * as Blockly from 'blockly';

/**
 * Append the shared ADC2 × WiFi analog-read warning to a block tooltip.
 *
 * On ESP32, ADC2 pins (GPIO 0/2/4/12-15/25-27) cannot perform analogRead while
 * the WiFi radio is active (WiFi occupies ADC2). Analog-read blocks let the user
 * pick any GPIO 0-39 via inline FieldNumber, so a user who selects an ADC2 pin
 * and also uses WiFi/OTA hits silent 0/undefined reads. This appends a 5-language
 * warning (i18n key blocks.common.adc2WifiWarning → BLOCKS_COMMON_ADC2WIFIWARNING).
 *
 * Static note only — the dynamic three-condition alert (analogRead × ADC2 × WiFi
 * coexisting in the workspace) is a separate proposal (plans/active/61).
 */
export function withAdc2WifiWarning(baseTooltip: string): string {
  const warning =
    Blockly.Msg.BLOCKS_COMMON_ADC2WIFIWARNING ||
    '⚠️ ADC2 pins (GPIO 0/2/4/12-15/25-27) cannot do analog reads while WiFi is active. Use ADC1 (GPIO 32-39).';
  return `${baseTooltip}\n\n${warning}`;
}
