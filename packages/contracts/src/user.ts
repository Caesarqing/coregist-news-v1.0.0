import type { LanguageCode } from './common';
import type { AuthenticatedUserProfile, PushSettingsEntry } from './auth';

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  phone?: string;
  birthday?: string;
  avatar?: string;
  avatar_url?: string;
}

export interface UserSettingsResponse {
  pushSettingsList: PushSettingsEntry[];
  language?: LanguageCode;
}

export interface UpdateUserSettingsRequest {
  pushSettingsList?: PushSettingsEntry[];
  language?: LanguageCode;
}

export interface UpdateUserSettingsResponse {
  ok: boolean;
  pushSettingsList?: PushSettingsEntry[];
  language?: LanguageCode;
}

export type UserProfileResponse = AuthenticatedUserProfile;
