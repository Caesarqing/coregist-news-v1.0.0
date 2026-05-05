import type {
  AuthResult,
  AuthenticatedUserProfile,
  ChangePasswordRequest,
  LoginRequest,
  NewsItem,
  PushSettingsEntry,
  PushSettings,
  TrackingAnalyticsData,
  TrackingNewsItem,
  TrackingTopic,
} from '@coregist/contracts';

export type User = AuthenticatedUserProfile;

export interface UserCreate {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  verification_code?: string;
  name?: string;
  fullName?: string;
  phone?: string;
}

export type UserLogin = LoginRequest;

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export type UserPasswordChange = ChangePasswordRequest;

export type {
  AuthResult,
  NewsItem,
  PushSettingsEntry,
  PushSettings,
  TrackingAnalyticsData,
  TrackingNewsItem,
  TrackingTopic,
};
