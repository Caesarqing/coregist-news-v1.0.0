import type { NewsItem } from '~/api/apiClient';

interface MapNewsItemOptions {
  language: 'zh-CN' | 'en';
  noTitle: string;
  uncategorized: string;
  unknownSource: string;
  fallbackImageUrl?: string;
}

function buildSourceLogoUrl(raw: any): string {
  if (raw.source_logo_url) return raw.source_logo_url;
  const candidate = raw.sourceLink || raw.link || raw.source_url || '';
  try {
    const hostname = new URL(candidate).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  } catch {
    return '';
  }
}

export function mapNewsItem(raw: any, options: MapNewsItemOptions): NewsItem {
  const isChinese = options.language === 'zh-CN';
  const sourceLogoUrl = buildSourceLogoUrl(raw);
  const imageFallbackType = raw.imageFallbackType || raw.image_fallback_type || '';
  const imageUrl =
    raw.imageUrl ||
    raw.image_link ||
    (imageFallbackType === 'source_logo' ? sourceLogoUrl : '') ||
    sourceLogoUrl ||
    options.fallbackImageUrl ||
    '';
  const localizedTitle = isChinese
    ? raw.title_zh || raw.title || raw.title_en || options.noTitle
    : raw.title_en || raw.title || raw.title_zh || options.noTitle;
  const localizedSummary = isChinese
    ? raw.summary_zh || raw.summary || raw.summary_en || ''
    : raw.summary_en || raw.summary || raw.summary_zh || '';
  const classificationStatus = raw.classificationStatus || raw.classification_status || 'confirmed';
  const localizedCategory = classificationStatus !== 'confirmed'
    ? (isChinese ? '待分类' : 'Pending classification')
    : isChinese
    ? raw.level1_name_zh || raw.category || raw.level1_name_en || options.uncategorized
    : raw.level1_name_en || raw.category || raw.level1_name_zh || options.uncategorized;
  const localizedSource = isChinese
    ? raw.source_zh || raw.source || raw.source_en || options.unknownSource
    : raw.source_en || raw.source || raw.source_zh || options.unknownSource;

  return {
    id: raw.id?.toString() || raw._id?.toString() || '',
    title: localizedTitle,
    summary: localizedSummary,
    fullContent: isChinese
      ? raw.fullContent_zh || localizedSummary || raw.fullContent || ''
      : raw.fullContent_en || localizedSummary || raw.fullContent || '',
    category: localizedCategory,
    publishTime: raw.publishTime || raw.postedAt || raw.crawledAt || null,
    source: localizedSource,
    sourceLink: raw.sourceLink || raw.link || '',
    imageUrl,
    sourceLogoUrl,
    imageFallbackType,
    classificationStatus,
    classificationConfidence: raw.classificationConfidence || raw.classification_confidence || 0,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : undefined,
  };
}

export function formatNewsDate(value: string | null | undefined, language: 'zh-CN' | 'en') {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US');
  } catch {
    return value;
  }
}
