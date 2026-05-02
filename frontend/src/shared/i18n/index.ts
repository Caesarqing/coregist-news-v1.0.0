import { enMessages } from './messages/en';
import { zhCNMessages } from './messages/zh-CN';

export type Language = 'zh-CN' | 'en';
export type MessageDictionary = Record<string, string>;

export const translations: Record<Language, MessageDictionary> = {
  'zh-CN': zhCNMessages,
  en: enMessages,
};
