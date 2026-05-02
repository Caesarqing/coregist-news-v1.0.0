export interface AiSearchRequest {
  query: string;
  image_url?: string;
  image_urls?: string[];
}

export interface AiSearchUsedNews {
  id: string;
  title_zh?: string;
  title_en?: string;
  link?: string;
}

export interface AiSearchResponse {
  query: string;
  answer: string;
  imageUrls: string[];
  usedNews: AiSearchUsedNews[];
}
