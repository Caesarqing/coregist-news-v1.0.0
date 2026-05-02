export type LanguageCode = 'zh-CN' | 'en';

export interface ApiEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  size?: number;
}

export interface OptionItem {
  label: string;
  value: string;
}
