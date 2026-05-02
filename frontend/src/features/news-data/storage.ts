import type { NewsDataItem } from './model';
import { newsDataMock } from './mock';

export const NEWS_MY_SPACE_STORAGE_KEY = 'coregist-news-my-space-ids';
export const NEWS_DATA_ITEMS_STORAGE_KEY = 'coregist-news-data-items';

export function getMySpaceIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(NEWS_MY_SPACE_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function setMySpaceIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NEWS_MY_SPACE_STORAGE_KEY, JSON.stringify(ids));
}

export function getNewsDataItems(): NewsDataItem[] {
  if (typeof window === 'undefined') return newsDataMock;
  try {
    const value = window.localStorage.getItem(NEWS_DATA_ITEMS_STORAGE_KEY);
    if (!value) return newsDataMock;
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return newsDataMock;
    return parsed as NewsDataItem[];
  } catch {
    return newsDataMock;
  }
}

export function setNewsDataItems(items: NewsDataItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NEWS_DATA_ITEMS_STORAGE_KEY, JSON.stringify(items));
}
