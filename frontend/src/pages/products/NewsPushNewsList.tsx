import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { ImageWithFallback } from '~/shared/components/ImageWithFallback';
import { Newspaper, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { newsApi, type NewsItem } from '~/api/apiClient';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';
import { Badge } from '~/shared/ui/badge';
import { formatNewsDate, mapNewsItem } from '~/utils/news';

/**
 * 我的新闻列表页面
 * - 根据推送批次展示相关新闻
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
  const batchStatus = searchParams.get('status') || '';
  const batchMatchedCount = Number(searchParams.get('matchedCount') || notificationNewsIds.length || 0);
  const batchPushCount = Number(searchParams.get('pushCount') || 0);
  const scheduledFor = searchParams.get('scheduledFor') || '';
  const isProcessingBatch = ['queued', 'processing'].includes(batchStatus);
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

  // 获取新闻列表（根据推送批次绑定的 newsIds）
  const fetchNewsData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (notificationNewsIds.length > 0) {
        const detailItems = await Promise.all(
          notificationNewsIds.map((newsId) => newsApi.getNewsDetail(newsId, language).catch(() => null))
        );
        setNewsData(detailItems.filter(Boolean).map(transformNewsItem) as NewsItem[]);
        return;
      }
      setNewsData([]);
    } catch (error) {
      console.error('获取新闻列表失败:', error);
      setNewsData([]);
    } finally {
      setIsLoading(false);
    }
  }, [language, notificationNewsIdsParam, transformNewsItem]);

  // 初始加载
  useEffect(() => {
    fetchNewsData();
  }, [fetchNewsData]);

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
        {isProcessingBatch && (
          <Card className="border border-border mb-6">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {language === 'zh-CN'
                ? `后台正在补充本次推送新闻。当前状态：${batchStatus || 'queued'}`
                : `This push is still collecting matching news. Current status: ${batchStatus || 'queued'}`}
            </CardContent>
          </Card>
        )}
        {(batchStatus || batchPushCount > 0 || scheduledFor) && (
          <Card className="border border-border mb-6">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {language === 'zh-CN'
                ? `本次推送：${batchMatchedCount}/${batchPushCount || batchMatchedCount} 条${scheduledFor ? ` · ${new Date(scheduledFor).toLocaleString('zh-CN')}` : ''}`
                : `This push: ${batchMatchedCount}/${batchPushCount || batchMatchedCount} items${scheduledFor ? ` · ${new Date(scheduledFor).toLocaleString('en-US')}` : ''}`}
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
                {isProcessingBatch
                  ? (language === 'zh-CN' ? '本次推送仍在补充新闻，请稍后再看。' : 'This push is still collecting news. Please check again later.')
                  : (language === 'zh-CN' ? '暂无到点推送结果' : 'No scheduled push results yet')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {language === 'zh-CN'
                  ? '这里只展示消息通知或推送批次绑定的新闻，不会自动扩大搜索全库新闻。'
                  : 'Only news linked to this notification or push batch is shown here.'}
              </p>
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
