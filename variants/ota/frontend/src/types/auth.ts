/**
 * 認証関連の型定義
 */

export interface User {
  id: number;
  email: string;
  passkeyOnly?: number;
  createdAt?: string;
  subscription?: {
    status: string;
    planType: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
  verificationToken?: string;
  verificationUrl?: string;
}

export interface Passkey {
  id: number;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface PasskeyListResponse {
  authenticators: Passkey[];
}

export interface EmailVerificationResponse {
  verified: boolean;
  message: string;
}

export interface RecoveryResponse extends AuthTokens {
  user: User;
  message: string;
}
