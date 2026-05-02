export interface NewsDataItem {
  id: string;
  headline: string;
  tags: string[];
  uploadDate: string;
  description: string;
  detail: string;
  downloads: number;
  views: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function getDayDiff(dateString: string): number {
  const date = new Date(`${dateString}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS);
}

function hashValue(input: string) {
  return input.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function toDate(value?: string | null) {
  if (!value) return new Date().toISOString().split('T')[0];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split('T')[0];
  return date.toISOString().split('T')[0];
}

export function toNewsDataItem(raw: any): NewsDataItem {
  const id = raw.id?.toString() || raw._id?.toString() || '';
  const hash = hashValue(id || raw.title || raw.headline || 'news');
  const downloads = 800 + (hash % 3000);
  const views = downloads * 3 + (hash % 500);
  const tags =
    Array.isArray(raw.keywords) && raw.keywords.length > 0
      ? raw.keywords
      : Array.isArray(raw.tags_zh) && raw.tags_zh.length > 0
        ? raw.tags_zh
        : Array.isArray(raw.tags_en)
          ? raw.tags_en
          : Array.isArray(raw.tags)
            ? raw.tags
            : [];

  return {
    id,
    headline: raw.title || raw.title_zh || raw.title_en || raw.headline || '',
    tags,
    uploadDate: toDate(raw.publishTime || raw.postedAt || raw.crawledAt || raw.uploadDate),
    description: raw.summary || raw.summary_zh || raw.summary_en || raw.description || '',
    detail: raw.fullContent || raw.summary || raw.summary_zh || raw.summary_en || raw.detail || '',
    downloads,
    views,
  };
}
