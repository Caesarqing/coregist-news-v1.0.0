import type { LanguageCode } from './common';

export interface UserSummary {
  id: string;
  email: string;
  username?: string;
  name?: string;
  avatar_url?: string;
}

export interface TokenPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResult extends TokenPayload {
  token?: string;
  user?: UserSummary;
}

export interface CheckUsernameResult {
  available: boolean;
  reason?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  name?: string;
  fullName?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface SendResetCodeRequest {
  method: 'email';
  email: string;
}

export interface ResetPasswordRequest {
  method: 'email';
  email: string;
  code: string;
  new_password: string;
}

export interface GoogleLoginRequest {
  token: string;
}

export interface AuthenticatedUserProfile extends UserSummary {
  bio?: string;
  phone?: string;
  birthday?: string;
  avatar?: string;
  pushSettingsList?: PushSettingsEntry[];
  language?: LanguageCode;
  createdAt?: string;
  updatedAt?: string;
}

export interface PushSettingsEntry {
  id?: string;
  pushDays: string[];
  pushTimes: string[];
  pushCount: number;
  everyday: boolean;
  keywords: string[];
  createdAt?: string;
  updatedAt?: string;
}
