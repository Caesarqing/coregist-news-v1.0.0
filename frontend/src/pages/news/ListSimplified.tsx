import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '~/shared/ui/card';
import { Badge } from '~/shared/ui/badge';
import { Input } from '~/shared/ui/input';
import { Button } from '~/shared/ui/button';
import { ImageWithFallback } from '~/shared/components/ImageWithFallback';
import { Newspaper, Loader2, Search, ArrowRight } from 'lucide-react';
import { newsApi, searchApi, type NewsItem } from '~/api/apiClient';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';
import { formatNewsDate, mapNewsItem } from '~/utils/news';

/**
 * 新闻中心页面
 * - 使用新闻列表接口展示最新新闻
 * - 包含新闻卡片基础信息（标题、类型、简要、来源、时间）
 * - 支持本地搜索过滤与点击查看详情
 */
export function NewsPageSimplified() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const heroDescription =
    language === 'zh-CN'
      ? '获取最新、最热的新闻资讯，洞察行业动态与全球趋势'
       : 'Get the latest news and insights into industry trends and global developments';

  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 转换后端数据格式
  const transformNewsItem = useCallback(
    (item: any): NewsItem =>
      mapNewsItem(item, {
        language,
        noTitle: t('noTitle'),
        uncategorized: t('uncategorized'),
        unknownSource: t('unknownSource'),
      }),
    [language, t]
  );

  // 获取最新新闻列表
  const fetchNewsData = useCallback(async (queryText: string = '') => {
    setIsLoading(true);
    try {
      try {
        const result = await searchApi.query({
          query: queryText,
          mode: 'news',
          page: 1,
          limit: 100,
          allow_discovery: false,
          language,
        });
        const transformedNews: NewsItem[] = result.items.map(transformNewsItem);
        if (transformedNews.length > 0 || queryText.trim()) {
          setNewsData(transformedNews);
          return;
        }
      } catch (searchError) {
        console.warn('统一搜索获取新闻失败，回退到公共新闻列表接口:', searchError);
      }

      const fallbackResult = await newsApi.getNews({
        page: 1,
        limit: 100,
        keywords: queryText.trim() ? [queryText.trim()] : undefined,
        language,
      });
      const fallbackNews: NewsItem[] = fallbackResult.items.map(transformNewsItem);
      setNewsData(fallbackNews);
    } catch (error) {
      console.error('获取新闻列表失败:', error);
      setNewsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [language, transformNewsItem]);

  // 初始加载
  useEffect(() => {
    fetchNewsData();
  }, [fetchNewsData]);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('newsCenter')}
        description={heroDescription}
        icon={Newspaper}
      />

      {/* 新闻列表内容区域 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Card className="border border-border mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void fetchNewsData(searchQuery.trim());
                  }
                }}
                placeholder={t('searchInRecommendations')}
                className="flex-1"
              />
              <Button className="px-4" type="button" onClick={() => void fetchNewsData(searchQuery.trim())}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* News List */}
        {isLoading && newsData.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : newsData.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? t('noRelatedNews') : t('noRecommendations')}
              </p>
              {!searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">{t('checkKeywordsOrTryLater')}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {newsData.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden border border-border hover:border-border/80 hover:shadow-sm transition-all duration-200 group cursor-pointer"
                onClick={() => navigate(`/news/${item.id}`)}
              >
                <CardContent className="p-0 h-full flex flex-col">
                  <div className="relative h-40 overflow-hidden bg-muted">
                    {item.imageFallbackType === 'source_logo' ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted/40 p-8">
                        <ImageWithFallback
                          src={item.imageUrl}
                          alt={item.source}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    )}
                    <div className="absolute left-2 top-2">
                      <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mt-2 flex-1">{item.summary}</p>
                    <div className="mt-4 space-y-2">
                      <div className="text-xs text-muted-foreground truncate">{item.source}</div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {formatNewsDate(item.publishTime, language)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-primary">
                          {language === 'zh-CN' ? '查看详情' : 'View'}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
