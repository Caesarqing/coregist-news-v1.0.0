import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '~/shared/ui/button';
import { Card, CardContent } from '~/shared/ui/card';
import { ArrowLeft, Clock3, Loader2, RefreshCw, Target } from 'lucide-react';
import { PageHero } from '~/shared/components/PageHero';
import { useLanguage } from '~/contexts/LanguageContext';
import { trackingApi, type TrackingNewsItem, type TrackingTopic } from '~/api/apiClient';

type RelatedNewsItem = TrackingNewsItem;

interface TimelineState {
  topicId?: string;
  topicName?: string;
  keywords?: string[];
  topic?: TrackingTopic;
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
  const [topic, setTopic] = useState<TrackingTopic | null>(timelineState.topic || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadNews = async () => {
    if (!topicId) return;
    const result = await trackingApi.getTopicNews(topicId, 100, language);
    setTopic(result.topic || null);
    setTopicName(result.topic?.name || (isZh ? '追踪主题' : 'Tracking Topic'));
    setKeywords(result.topic?.keywords || []);
    setNews(result.items || []);
  };

  useEffect(() => {
    let mounted = true;
    if (!topicId) return;

    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        const result = await trackingApi.getTopicNews(topicId, 100, language);
        if (!mounted) return;
        setTopic(result.topic || null);
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

    load();
    return () => {
      mounted = false;
    };
  }, [topicId, isZh, language]);

  const handleRunTopic = async () => {
    if (!topicId) return;
    setIsRefreshing(true);
    setError('');
    try {
      const result = await trackingApi.runTopic(topicId);
      setTopic(result.topic || null);
      await loadNews();
    } catch (err: any) {
      setError(err?.message || (isZh ? '重新追踪失败' : 'Failed to refresh tracking'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const emptyText = () => {
    if (!topic?.lastRunAt) {
      return isZh ? '正在准备首次追踪。' : 'Preparing the first tracking run.';
    }
    if (topic.status === 'processing') {
      return isZh ? '正在搜索和分析相关新闻。' : 'Searching and analyzing related news.';
    }
    if (topic.status === 'backlogged') {
      return isZh ? '队列积压，本轮追踪已延后。' : 'Queue is backlogged. This run was deferred.';
    }
    if (topic.status === 'failed') {
      return topic.lastError || (isZh ? '追踪失败，请稍后重试。' : 'Tracking failed. Retry later.');
    }
    return isZh ? '本次暂无匹配新闻。' : 'No matching news for this run.';
  };

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
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunTopic}
          disabled={isRefreshing}
          className="ml-2"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isZh ? '重新追踪' : 'Refresh'}
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
            {topic && (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {isZh ? '状态' : 'Status'}: {topic.status || 'waiting'} · {isZh ? '命中' : 'Matched'} {topic.newsCount || 0}
              </p>
            )}
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
              {emptyText()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
