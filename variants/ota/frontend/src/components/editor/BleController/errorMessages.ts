/**
 * Friendly Web Bluetooth error mapping (47.md commit #8, Phase 1 polish).
 *
 * Web Bluetooth + GATT operations throw DOMException with a `name` property
 * (NotFoundError / NetworkError / SecurityError / NotSupportedError /
 * AbortError / InvalidStateError). Raw `err.message` is technical and mixes
 * browser implementation detail. This module maps those to localized,
 * user-actionable strings.
 *
 * Returns null for "user-cancelled the chooser" so call sites can suppress
 * the toast entirely. Returns the localized string otherwise. Falls back to
 * the raw message for unknown error shapes (preserves diagnostic info).
 */
import type { TFunction } from 'i18next';

export interface FriendlyError {
  /** Short user-facing message. */
  message: string;
  /** True when the failure is transient and a retry has a reasonable chance. */
  retryable: boolean;
}

export function describeBleError(err: unknown, t: TFunction): FriendlyError | null {
  if (!(err instanceof Error)) {
    return {
      message: t('bleController.errors.unknown', { defaultValue: '不明なエラーが発生しました。' }),
      retryable: true,
    };
  }

  // Suppress user-cancelled chooser entirely — the user already knows why.
  if (err.name === 'NotFoundError' && /cancell?ed/i.test(err.message)) {
    return null;
  }

  switch (err.name) {
    case 'NotFoundError':
      return {
        message: t('bleController.errors.notFound', {
          defaultValue: '対象のデバイスまたはサービスが見つかりませんでした。電源と書き込み済みプログラムをご確認ください。',
        }),
        retryable: true,
      };
    case 'NetworkError':
      return {
        message: t('bleController.errors.network', {
          defaultValue: '通信中に切断されました。デバイスを近づけて再接続してください。',
        }),
        retryable: true,
      };
    case 'NotSupportedError':
      return {
        message: t('bleController.errors.notSupported', {
          defaultValue: 'このブラウザでは Web Bluetooth のこの操作がサポートされていません。',
        }),
        retryable: false,
      };
    case 'SecurityError':
      return {
        message: t('bleController.errors.security', {
          defaultValue: 'ペアリングが拒否されました。再度お試しください。',
        }),
        retryable: true,
      };
    case 'InvalidStateError':
      return {
        message: t('bleController.errors.invalidState', {
          defaultValue: 'デバイスが応答可能な状態ではありません。再接続してください。',
        }),
        retryable: true,
      };
    case 'AbortError':
      return {
        message: t('bleController.errors.aborted', {
          defaultValue: '操作が中断されました。',
        }),
        retryable: true,
      };
  }

  // Custom errors thrown by WebBluetoothClient
  if (err.name === 'WebBluetoothNotSupportedError') {
    return {
      message: t('bleController.noWebBluetooth', {
        defaultValue: 'お使いのブラウザは Web Bluetooth に非対応です。Chrome / Edge / Opera (デスクトップまたは Android) をご利用ください。',
      }),
      retryable: false,
    };
  }
  if (err.name === 'WebBluetoothNotConnectedError') {
    return {
      message: t('bleController.errors.notConnected', {
        defaultValue: 'デバイスが接続されていません。',
      }),
      retryable: false,
    };
  }

  // Fallback — preserve diagnostic content but in a friendlier wrapper
  return {
    message: t('bleController.errors.generic', {
      defaultValue: '通信エラー: {{detail}}',
      detail: err.message,
    }),
    retryable: true,
  };
}

/**
 * iOS Safari + every iOS browser uses WebKit, which has zero Web Bluetooth
 * support. Detection is UA-based because there is no feature detection that
 * reliably distinguishes "no API" from "API behind permission". Limited
 * to UA sniffing intentionally.
 */
export function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPhone / iPod / iPad (incl. iPadOS 13+ desktop UA which masquerades as Mac
  // but exposes ontouchend on document).
  if (/iPhone|iPod/.test(ua)) return true;
  if (/iPad/.test(ua)) return true;
  if (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document) {
    return true;
  }
  return false;
}
