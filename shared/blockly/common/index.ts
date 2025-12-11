/**
 * 共通ブロック - Arduino/MicroPython両対応
 * Blockly標準ブロックを使用（カスタムジェネレータで言語別コード生成）
 */

// 共通ブロックはBlockly標準を使用
// ジェネレータのみ言語別に実装

export const COMMON_CATEGORIES = {
  logic: ['controls_if', 'controls_ifelse', 'logic_compare', 'logic_operation', 'logic_negate', 'logic_boolean', 'logic_ternary'],
  loops: ['controls_repeat_ext', 'controls_whileUntil', 'controls_for', 'controls_flow_statements'],
  math: ['math_number', 'math_arithmetic', 'math_random_int', 'math_modulo', 'math_constrain', 'math_round', 'math_single'],
  text: ['text', 'text_join', 'text_length'],
};
