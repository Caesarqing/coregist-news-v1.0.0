import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { ImageWithFallback } from '~/shared/components/ImageWithFallback';
import { Newspaper, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { newsApi, searchApi, type NewsItem, type SearchJobSnapshot } from '~/api/apiClient';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';
import { Badge } from '~/shared/ui/badge';
import { formatNewsDate, mapNewsItem } from '~/utils/news';

/**
 * 我的新闻列表页面
 * - 根据关键词展示相关新闻
 * - 使用与新闻中心相同的展示风格
 */
export function NewsPushNewsListPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { language, t } = useLanguage();
  
  const keywordsParam = searchParams.get('keywords') || '';
  const keywords = keywordsParam ? keywordsParam.split(',') : [];
  const notificationNewsIdsParam = searchParams.get('newsIds') || '';
  const notificationNewsIds = notificationNewsIdsParam.split(',').map((item) => item.trim()).filter(Boolean);
  const heroTitle = language === 'zh-CN' ? '我的新闻' : 'My News';
  const heroDescription = keywords.length > 0
    ? (language === 'zh-CN' 
        ? `关键词：${keywords.join('、')}` 
        : `Keywords: ${keywords.join(', ')}`)
    : (language === 'zh-CN' 
        ? '查看您的个性化新闻推送' 
        : 'View your personalized news feed');

  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [job, setJob] = useState<SearchJobSnapshot | null>(null);
  const [jobId, setJobId] = useState('');

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

  // 获取新闻列表（根据关键词）
  const fetchNewsData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (notificationNewsIds.length > 0) {
        const detailItems = await Promise.all(
          notificationNewsIds.map((newsId) => newsApi.getNewsDetail(newsId, language).catch(() => null))
        );
        setNewsData(detailItems.filter(Boolean).map(transformNewsItem) as NewsItem[]);
        setJobId('');
        return;
      }
      const result = await searchApi.query({
        query: keywords.join(' '),
        mode: 'news',
        page: 1,
        limit: 100,
        allow_discovery: true,
      });
      const transformedNews: NewsItem[] = result.items.map(transformNewsItem);
      setNewsData(transformedNews);
      if (result.search_job?.job_id) {
        setJobId(result.search_job.job_id);
      }
    } catch (error) {
      console.error('获取新闻列表失败:', error);
      setNewsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [keywordsParam, language, notificationNewsIdsParam, transformNewsItem]);

  // 初始加载
  useEffect(() => {
    fetchNewsData();
  }, [fetchNewsData]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const snapshot = await searchApi.getJob(jobId);
        if (cancelled) return;
        setJob(snapshot);
        if (snapshot.status === 'completed' || snapshot.status === 'failed') {
          window.clearInterval(timer);
          await fetchNewsData();
        }
      } catch (error) {
        console.error('获取搜索任务状态失败:', error);
        window.clearInterval(timer);
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [fetchNewsData, jobId]);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={heroTitle}
        description={heroDescription}
        icon={Newspaper}
      />

      {/* 返回按钮 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/home/news-push?tab=my-news')}
          className="rounded-xl border-slate-200 bg-white hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>
      </div>

      {/* 新闻列表内容区域 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {jobId && (
          <Card className="border border-border mb-6">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {language === 'zh-CN'
                ? `后台正在根据关键词补充搜索新闻。当前状态：${job?.status || 'queued'}`
                : `Background search is fetching more news for your keywords. Current status: ${job?.status || 'queued'}`}
            </CardContent>
          </Card>
        )}
        {/* News List */}
        {isLoading && newsData.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : newsData.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {t('noRecommendations')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{t('checkKeywordsOrTryLater')}</p>
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
