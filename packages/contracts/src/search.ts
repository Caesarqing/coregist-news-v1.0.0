import type { NewsItem } from './news';

export type SearchMode = 'news' | 'ai';
export type SearchTimeRange = '24h' | '7d' | '30d' | 'custom';

export interface UnifiedSearchFilters {
  category?: string[];
  source?: string[];
  time_range?: SearchTimeRange | '';
}

export interface UnifiedSearchRequest {
  query: string;
  mode: SearchMode;
  filters?: UnifiedSearchFilters;
  page?: number;
  limit?: number;
  allow_discovery?: boolean;
}

export interface SearchJobSnapshot {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  query: string;
  mode: SearchMode;
  counts: {
    discovered: number;
    enrichment_queued: number;
    enrichment_processing: number;
    ready_for_ai: number;
    ai_processing: number;
    completed: number;
    failed: number;
    enrichment_failed: number;
    linked_news: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UnifiedSearchResponse {
  query: string;
  mode: SearchMode;
  items: NewsItem[];
  total: number;
  page: number;
  limit: number;
  search_job: {
    triggered: boolean;
    job_id?: string;
    status?: string;
  };
}
