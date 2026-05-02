export interface TrackingTopic {
  id: string;
  name: string;
  keywords: string[];
  urls: string[];
  newsCount: number;
  createdAt: string;
}

export interface CreateTrackingTopicRequest {
  name: string;
  keywords: string[];
  urls: string[];
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
}

export interface TrackingAnalyticsData {
  trendData: { date: string; count: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
  topSources: { source: string; count: number }[];
}
