import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Input } from '~/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/ui/tabs';
import { Target, Trash2, BarChart3, FileText, ArrowLeft, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { PageHero } from '~/shared/components/PageHero';
import {
  trackingApi,
  type TrackingAnalyticsData,
  type TrackingNewsItem,
  type TrackingTopic,
} from '~/api/apiClient';

export function TargetedTrackingPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const heroDescription =
    language === 'zh-CN'
      ? '实时监控特定主题和品牌，获取竞争动态和舆情变化'
       : 'Real-time monitoring of topics and brands, track competition and sentiment';
  const [topics, setTopics] = useState<TrackingTopic[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicKeywords, setNewTopicKeywords] = useState('');
  const [newTopicUrls, setNewTopicUrls] = useState<string[]>(['']);
  const [activeTab, setActiveTab] = useState('tracking');
  const [analyticsData, setAnalyticsData] = useState<TrackingAnalyticsData | null>(null);
  const [runningTopicIds, setRunningTopicIds] = useState<Set<string>>(new Set());

  const reloadTrackingData = async () => {
    const [topicsRes, analyticsRes] = await Promise.all([
      trackingApi.getTopics(),
      trackingApi.getAnalytics(),
    ]);
    setTopics(topicsRes.items || []);
    setAnalyticsData(analyticsRes);
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [topicsRes, analyticsRes] = await Promise.all([
          trackingApi.getTopics(),
          trackingApi.getAnalytics(),
        ]);
        if (!mounted) return;
        setTopics(topicsRes.items || []);
        setAnalyticsData(analyticsRes);
      } catch (err) {
        console.error('加载定向追踪数据失败:', err);
        if (!mounted) return;
        setTopics([]);
        setAnalyticsData({
          trendData: [],
          sentiment: { positive: 0, neutral: 0, negative: 0 },
          topSources: [],
        });
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddTopic = async () => {
    if (newTopicName.trim()) {
      const keywordArray = newTopicKeywords
        .split(/[，,；;]/)
        .map((k) => k.trim())
        .filter((k) => k);
      const urlArray = newTopicUrls
        .map((url) => url.trim())
        .filter((url) => url.length > 0);
      try {
        const created = await trackingApi.createTopic({
          name: newTopicName.trim(),
          keywords: keywordArray,
          urls: urlArray,
        });
        setTopics((prev) => [created, ...prev]);
        setNewTopicName('');
        setNewTopicKeywords('');
        setNewTopicUrls(['']);
        await reloadTrackingData();
      } catch (err: any) {
        alert(err?.message || (language === 'zh-CN' ? '添加主题失败' : 'Failed to add topic'));
      }
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    // Each row accepts only one URL value.
    const normalized = value.replace(/\s+/g, '').split(/[，,；;]/)[0] || '';
    setNewTopicUrls((prev) => prev.map((url, i) => (i === index ? normalized : url)));
  };

  const handleAddUrlField = () => {
    setNewTopicUrls((prev) => (prev.length >= 20 ? prev : [...prev, '']));
  };

  const handleRemoveUrlField = (index: number) => {
    setNewTopicUrls((prev) => {
      if (prev.length === 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleResetNewTopic = () => {
    setNewTopicName('');
    setNewTopicKeywords('');
    setNewTopicUrls(['']);
  };

  const handleRemoveTopic = async (id: string) => {
    try {
      await trackingApi.deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
      await reloadTrackingData();
    } catch (err: any) {
      alert(err?.message || (language === 'zh-CN' ? '删除主题失败' : 'Failed to delete topic'));
    }
  };

  const handleRunTopic = async (topic: TrackingTopic) => {
    setRunningTopicIds((prev) => new Set(prev).add(topic.id));
    try {
      const result = await trackingApi.runTopic(topic.id);
      setTopics((prev) => prev.map((item) => (item.id === topic.id ? result.topic : item)));
      await reloadTrackingData();
    } catch (err: any) {
      alert(err?.message || (language === 'zh-CN' ? '重新追踪失败' : 'Failed to refresh tracking'));
    } finally {
      setRunningTopicIds((prev) => {
        const next = new Set(prev);
        next.delete(topic.id);
        return next;
      });
    }
  };

  const statusLabel = (topic: TrackingTopic) => {
    const labels: Record<string, string> = language === 'zh-CN'
      ? {
          waiting: '等待中',
          processing: '搜索中',
          updated: '已更新',
          failed: '失败',
          backlogged: '队列积压',
        }
      : {
          waiting: 'Waiting',
          processing: 'Searching',
          updated: 'Updated',
          failed: 'Failed',
          backlogged: 'Backlogged',
        };
    return labels[topic.status || 'waiting'] || labels.waiting;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return language === 'zh-CN' ? '尚未运行' : 'Not run yet';
    try {
      return new Date(value).toLocaleString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  };

  const handleOpenTopicTimeline = async (topic: TrackingTopic) => {
    try {
      const result = await trackingApi.getTopicNews(topic.id, 50);
      navigate(`/home/targeted-tracking/${topic.id}`, {
        state: {
          topicId: topic.id,
          topicName: topic.name,
          keywords: topic.keywords,
          topic,
          news: result.items as TrackingNewsItem[],
        },
      });
    } catch (err) {
      console.error('加载主题时间线失败:', err);
      navigate(`/home/targeted-tracking/${topic.id}`, {
        state: {
          topicId: topic.id,
          topicName: topic.name,
          keywords: topic.keywords,
          topic,
          news: [],
        },
      });
    }
  };

  const sentimentTotal = Math.max(
    1,
    (analyticsData?.sentiment.positive || 0) +
      (analyticsData?.sentiment.neutral || 0) +
      (analyticsData?.sentiment.negative || 0)
  );
  const topSourceMax = Math.max(1, ...(analyticsData?.topSources || []).map((s) => s.count));

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('targetedTracking')}
        description={heroDescription}
        icon={Target}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/home')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>
      </div>

      {/* 内容区 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 border border-border rounded-lg">
              <TabsTrigger value="tracking" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language === 'zh-CN' ? '监控'  : 'Tracking'}
                </span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language === 'zh-CN' ? '分析'  : 'Analytics'}
                </span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language === 'zh-CN' ? '报告'  : 'Reports'}
                </span>
              </TabsTrigger>
            </TabsList>

            {/* 监控标签页 */}
            <TabsContent value="tracking" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border border-border">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-foreground">
                      {language === 'zh-CN' ? '添加新追踪主题'  : 'Add New Tracking Topic'}
                    </h3>
                    <div className="space-y-3">
                      <Input
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        placeholder={
                          language === 'zh-CN'
                            ? '主题名称'
                             : 'Topic name'
                        }
                        className="rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      />
                      <Input
                        value={newTopicKeywords}
                        onChange={(e) => setNewTopicKeywords(e.target.value)}
                        placeholder={
                          language === 'zh-CN'
                            ? '关键词（用逗号分隔）'
                             : 'Keywords (comma separated)'
                        }
                        className="rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                            {language === 'zh-CN' ? 'URL（最多 20 个）' : 'URLs (up to 20)'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {newTopicUrls.length}/20
                          </p>
                        </div>
                        {newTopicUrls.map((url, index) => (
                          <div key={`url-${index}`} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleAddUrlField}
                              disabled={newTopicUrls.length >= 20}
                              className="text-blue-600 hover:text-blue-700 disabled:text-gray-300 dark:text-blue-400 dark:hover:text-blue-300 dark:disabled:text-slate-600"
                              aria-label={language === 'zh-CN' ? '新增 URL 输入栏' : 'Add URL field'}
                            >
                              <PlusCircle className="w-5 h-5" />
                            </button>
                            <Input
                              value={url}
                              onChange={(e) => handleUrlChange(index, e.target.value)}
                              placeholder={
                                language === 'zh-CN'
                                  ? '输入一个 URL（例如 https://example.com）'
                                  : 'Enter one URL (e.g. https://example.com)'
                              }
                              className="rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveUrlField(index)}
                              disabled={newTopicUrls.length === 1}
                              className="text-blue-600 hover:text-blue-700 disabled:text-gray-300 dark:text-blue-400 dark:hover:text-blue-300 dark:disabled:text-slate-600"
                              aria-label={language === 'zh-CN' ? '删除 URL 输入栏' : 'Remove URL field'}
                            >
                              <MinusCircle className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl h-11 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                        onClick={handleResetNewTopic}
                      >
                        {language === 'zh-CN' ? '取消'  : 'Cancel'}
                      </Button>
                      <Button
                        onClick={handleAddTopic}
                        className="flex-1 rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {language === 'zh-CN' ? '添加'  : 'Add'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 追踪主题列表 */}
              <div className="space-y-3">
                {topics.length > 0 ? (
                  topics.map((topic, index) => (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card
                        className="border-slate-200 bg-white shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500"
                        onClick={() => handleOpenTopicTimeline(topic)}
                      >
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-slate-100">
                                  {topic.name}
                                </h4>
                                <span className="text-xs px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                  {statusLabel(topic)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {topic.keywords.map((keyword) => (
                                  <span
                                    key={keyword}
                                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-300">
                                <span>
                                  {language === 'zh-CN' ? '真实命中:'  : 'Matched:'}{' '}
                                  <span className="font-bold text-blue-600 dark:text-blue-300">{topic.newsCount}</span>
                                </span>
                                <span>
                                  {language === 'zh-CN' ? '候选:'  : 'Candidates:'}{' '}
                                  <span className="font-bold text-slate-700 dark:text-slate-200">{topic.candidateCount || 0}</span>
                                </span>
                                <span>
                                  {language === 'zh-CN' ? '上次运行:'  : 'Last run:'}{' '}
                                  {formatDateTime(topic.lastRunAt)}
                                </span>
                              </div>
                              {topic.lastError && (
                                <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                                  {topic.lastError}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRunTopic(topic);
                                }}
                                disabled={runningTopicIds.has(topic.id)}
                              >
                                <RefreshCw className={`w-4 h-4 ${runningTopicIds.has(topic.id) ? 'animate-spin' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveTopic(topic.id);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                    <p>
                      {language === 'zh-CN'
                        ? '还没有添加任何追踪主题，请添加您想要监控的内容'
                         : 'No tracking topics added yet. Add topics you want to monitor.'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 分析标签页 */}
            <TabsContent value="analytics" className="space-y-4">
              {analyticsData && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">
                          {language === 'zh-CN' ? '情感分析'  : 'Sentiment Analysis'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 dark:from-blue-950/30 dark:to-blue-900/20 dark:border-blue-900">
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold uppercase">
                              {language === 'zh-CN' ? '正面'  : 'Positive'}
                            </p>
                            <p className="text-3xl font-bold text-blue-800 dark:text-blue-200 mt-2">
                              {analyticsData.sentiment.positive}
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                              {((analyticsData.sentiment.positive / sentimentTotal) * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700">
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold uppercase">
                              {language === 'zh-CN' ? '中立'  : 'Neutral'}
                            </p>
                            <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-2">
                              {analyticsData.sentiment.neutral}
                            </p>
                            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2">
                              {((analyticsData.sentiment.neutral / sentimentTotal) * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200 dark:from-amber-950/30 dark:to-amber-900/20 dark:border-amber-900">
                            <p className="text-xs text-red-600 font-semibold uppercase">
                              {language === 'zh-CN' ? '负面'  : 'Negative'}
                            </p>
                            <p className="text-3xl font-bold text-red-700 mt-2">
                              {analyticsData.sentiment.negative}
                            </p>
                            <p className="text-xs text-red-600 mt-2">
                              {((analyticsData.sentiment.negative / sentimentTotal) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">
                          {language === 'zh-CN' ? '热门来源'  : 'Top Sources'}
                        </h3>
                        <div className="space-y-3">
                          {analyticsData.topSources.map((source, index) => (
                            <div key={source.source} className="flex items-center justify-between">
                              <span className="font-medium text-gray-700 dark:text-slate-200">{source.source}</span>
                              <div className="flex items-center gap-3">
                                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-700">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{
                                      width: `${(source.count / topSourceMax) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-bold text-gray-900 dark:text-slate-100 w-8 text-right">{source.count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              )}
            </TabsContent>

            {/* 报告标签页 */}
            <TabsContent value="reports" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                      {language === 'zh-CN' ? '生成报告'  : 'Generate Report'}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          {language === 'zh-CN' ? '报告周期'  : 'Report Period'}
                        </label>
                        <select className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>
                            {language === 'zh-CN' ? '日报告'  : 'Daily Report'}
                          </option>
                          <option>
                            {language === 'zh-CN' ? '周报告'  : 'Weekly Report'}
                          </option>
                          <option>
                            {language === 'zh-CN' ? '月报告'  : 'Monthly Report'}
                          </option>
                        </select>
                      </div>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11">
                        {language === 'zh-CN' ? '生成并导出'  : 'Generate & Export'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 历史报告列表 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {language === 'zh-CN' ? '历史报告'  : 'Report History'}
                  </h3>
                  <Card className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <CardContent className="p-4 text-center text-gray-500 dark:text-slate-400">
                      <p>
                        {language === 'zh-CN'
                          ? '还没有生成任何报告'
                           : 'No reports generated yet'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
