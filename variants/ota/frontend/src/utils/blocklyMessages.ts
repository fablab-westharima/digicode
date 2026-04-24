/**
 * Blockly Message Population Utility
 *
 * Populates Blockly.Msg.* namespace from i18next translations
 */

import * as Blockly from 'blockly';
import i18n from '@/i18n';

/**
 * Flatten nested i18next translations to Blockly.Msg.* format
 *
 * Example:
 *   { blocks: { actuator: { stepper: { init: "Initialize" } } } }
 * Becomes:
 *   BLOCKS_ACTUATOR_STEPPER_INIT: "Initialize"
 *
 * @param obj - The translation object to flatten
 * @param prefix - Current key prefix (for recursion)
 * @returns Flattened key-value object
 */
function flattenTranslations(
  obj: any,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (typeof value === 'string') {
      // Convert to uppercase and store
      result[newKey.toUpperCase()] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Recursively flatten nested objects
      Object.assign(result, flattenTranslations(value, newKey));
    }
  }

  return result;
}

/**
 * Populate Blockly.Msg.* from i18next translations
 * This must be called before Blockly block definitions are evaluated
 * and whenever the language changes
 *
 * @param lang - Language code (e.g., 'ja', 'en')
 */
export function populateBlocklyMessages(lang: string): void {
  // Get translations for current language
  const translations = i18n.getResourceBundle(lang, 'translation');

  if (!translations) {
    console.warn(`[Blockly i18n] No translations found for language: ${lang}`);
    return;
  }

  // Flatten and populate Blockly.Msg
  const flatMessages = flattenTranslations(translations);

  // IMPORTANT: Use imported Blockly.Msg (same reference as block definitions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msg = Blockly.Msg as any;

  for (const [key, value] of Object.entries(flatMessages)) {
    msg[key] = value;
  }

  console.log(
    `[Blockly i18n] Populated ${Object.keys(flatMessages).length} messages for language: ${lang}`
  );
}

/**
 * Initialize Blockly message system
 * Call this once during app initialization
 */
export function initBlocklyMessages(): void {
  // Populate for current language
  if (i18n.isInitialized) {
    populateBlocklyMessages(i18n.language);
  }

  // Listen for language changes and re-populate
  i18n.on('languageChanged', (lang: string) => {
    console.log('[Blockly i18n] Language changed to:', lang);
    populateBlocklyMessages(lang);
  });

  console.log('[Blockly i18n] Message system initialized');
}

/**
 * Get a Blockly message key from a translation path
 * Useful for debugging and validation
 *
 * Example:
 *   getBlocklyMessageKey('blocks.actuator.stepper.init')
 *   Returns: 'BLOCKS_ACTUATOR_STEPPER_INIT'
 *
 * @param translationPath - i18next translation key path
 * @returns Blockly.Msg key
 */
export function getBlocklyMessageKey(translationPath: string): string {
  return translationPath.replace(/\./g, '_').toUpperCase();
}
