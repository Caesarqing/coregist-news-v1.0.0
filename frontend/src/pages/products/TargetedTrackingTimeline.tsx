import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '~/shared/ui/button';
import { Card, CardContent } from '~/shared/ui/card';
import { ArrowLeft, Clock3, Loader2, Target } from 'lucide-react';
import { PageHero } from '~/shared/components/PageHero';
import { useLanguage } from '~/contexts/LanguageContext';
import { trackingApi, type TrackingNewsItem } from '~/api/apiClient';

type RelatedNewsItem = TrackingNewsItem;

interface TimelineState {
  topicId?: string;
  topicName?: string;
  keywords?: string[];
  news?: RelatedNewsItem[];
}

export function TargetedTrackingTimelinePage() {
  const navigate = useNavigate();
  const { id: topicId } = useParams<{ id: string }>();
  const { state } = useLocation();
  const { language, t } = useLanguage();
  const isZh = language === 'zh-CN';
  const timelineState = (state || {}) as TimelineState;

  const [topicName, setTopicName] = useState(
    timelineState.topicName || (isZh ? '追踪主题' : 'Tracking Topic')
  );
  const [keywords, setKeywords] = useState<string[]>(timelineState.keywords || []);
  const [news, setNews] = useState<RelatedNewsItem[]>(timelineState.news || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!topicId) return;

    const loadNews = async () => {
      try {
        setIsLoading(true);
        setError('');
        const result = await trackingApi.getTopicNews(topicId, 100, language);
        if (!mounted) return;
        setTopicName(result.topic?.name || (isZh ? '追踪主题' : 'Tracking Topic'));
        setKeywords(result.topic?.keywords || []);
        setNews(result.items || []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || (isZh ? '加载主题时间线失败' : 'Failed to load timeline'));
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadNews();
    return () => {
      mounted = false;
    };
  }, [topicId, isZh, language]);

  const sortedNews = useMemo(
    () =>
      [...news].sort((a, b) =>
        (b.publishedAt || '').localeCompare(a.publishedAt || '')
      ),
    [news]
  );

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={isZh ? `${topicName} 时间线` : `${topicName} Timeline`}
        description={isZh ? '按时间线查看该主题相关新闻' : 'View related news in timeline order'}
        icon={Target}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/home/targeted-tracking')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-4">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardContent className="p-5 space-y-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{topicName}</h3>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <CardContent className="p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-300" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-white dark:border-red-900 dark:bg-slate-900">
            <CardContent className="p-6 text-red-600">{error}</CardContent>
          </Card>
        ) : sortedNews.length > 0 ? (
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-blue-200 dark:bg-blue-900" />
            {sortedNews.map((item) => (
              <Card key={item.id} className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <CardContent className="p-5">
                  <div className="relative">
                    <span className="absolute -left-7 top-1.5 h-3 w-3 rounded-full bg-blue-600 dark:bg-blue-400 border-2 border-white dark:border-slate-900" />
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mb-2">
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>{item.publishedAt || (isZh ? '时间未知' : 'Unknown time')}</span>
                      <span>·</span>
                      <span>{item.source}</span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-slate-300">{item.summary}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <CardContent className="p-10 text-center text-gray-500 dark:text-slate-400">
              {isZh ? '暂无相关新闻，请先从追踪列表点击主题进入。' : 'No related news yet. Open from tracking list.'}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
