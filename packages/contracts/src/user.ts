import type { LanguageCode } from './common';
import type { AuthenticatedUserProfile, PushSettings, PushSettingsEntry } from './auth';

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  phone?: string;
  birthday?: string;
  avatar?: string;
  avatar_url?: string;
}

export interface UserSettingsResponse {
  pushSettings: PushSettings;
  pushSettingsList?: PushSettingsEntry[];
  language?: LanguageCode;
}

export interface UpdateUserSettingsRequest {
  pushSettings?: PushSettings;
  pushSettingsList?: PushSettingsEntry[];
  language?: LanguageCode;
}

export interface UpdateUserSettingsResponse {
  ok: boolean;
  pushSettings?: PushSettings;
  pushSettingsList?: PushSettingsEntry[];
  language?: LanguageCode;
}

export type UserProfileResponse = AuthenticatedUserProfile;
