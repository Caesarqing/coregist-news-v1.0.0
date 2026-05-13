export interface TrackingTopic {
  id: string;
  name: string;
  keywords: string[];
  urls: string[];
  newsCount: number;
  candidateCount: number;
  enabled: boolean;
  frequencyMinutes: number;
  lastRunAt: string;
  nextRunAt: string;
  lastJobId: string;
  lastError: string;
  matchedCount: number;
  status: 'waiting' | 'processing' | 'updated' | 'failed' | 'backlogged' | string;
  createdAt: string;
}

export interface CreateTrackingTopicRequest {
  name: string;
  keywords: string[];
  urls: string[];
  frequencyMinutes?: number;
  enabled?: boolean;
}

export interface TrackingNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string | null;
}

export interface TrackingTopicListResponse {
  items: TrackingTopic[];
  total: number;
}

export interface TrackingTopicNewsResponse {
  topic: TrackingTopic;
  items: TrackingNewsItem[];
  total: number;
  source?: 'mapped' | 'fallback' | string;
}

export interface TrackingTopicStatusResponse {
  topic: TrackingTopic;
  job: {
    jobId: string;
    status: string;
    error: string;
    triggeredAt: string;
    updatedAt: string;
  } | null;
}

export interface TrackingAnalyticsData {
  trendData: { date: string; count: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
  topSources: { source: string; count: number }[];
}
