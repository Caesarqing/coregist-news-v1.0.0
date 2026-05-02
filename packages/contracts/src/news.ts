import type { PaginatedResponse } from './common';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  category: string;
  publishTime: string | null;
  source: string;
  sourceLink: string;
  imageUrl: string;
  sourceLogoUrl?: string;
  imageFallbackType?: string;
  classificationStatus?: 'confirmed' | 'needs_review' | 'failed';
  classificationConfidence?: number;
  keywords?: string[];
}

export interface NewsListQuery {
  page?: number;
  limit?: number;
  category?: string;
  keywords?: string[];
  level1_code?: string;
  level2_code?: string;
}

export type NewsListResponse = PaginatedResponse<NewsItem>;

export interface NewsSearchResponse {
  items: NewsItem[];
  total: number;
  limit: number;
}

export type NewsDetailResponse = NewsItem;

export interface UpdateNewsStateRequest {
  status: 'read' | 'hidden' | 'bookmarked';
}

export interface UpdateNewsStateResponse {
  ok: boolean;
  data: {
    userId: string;
    newsId: string;
    status: 'read' | 'hidden' | 'bookmarked';
  };
}

export interface CreateNewsRequest {
  title_en: string;
  title_zh: string;
  summary_en?: string;
  summary_zh?: string;
  link: string;
  image_link?: string;
  image_confidence?: string;
  image_source_type?: string;
  image_fallback_type?: string;
  source_logo_url?: string;
  level1_code?: string;
  level1_name_zh?: string;
  level1_name_en?: string;
  level2_codes?: string[];
  level2_names_zh?: string[];
  level2_names_en?: string[];
  topic_tags?: string[];
  entity_tags?: string[];
  tags_en?: string[];
  tags_zh?: string[];
  classification_status?: 'confirmed' | 'needs_review' | 'failed';
  classification_method?: string;
  classification_confidence?: number;
  classification_evidence?: string[];
  classification_reasoning?: string;
  classification_candidates?: unknown[];
  sourceId?: string;
  source_en?: string;
  source_zh?: string;
  postedAt?: string;
  crawledAt?: string;
  language?: string;
  source_language?: string;
  display_language?: string;
}
