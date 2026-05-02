import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '~/shared/ui/button';
import { Card, CardContent } from '~/shared/ui/card';
import { LandingNavigation } from '~/shared/components/LandingNavigation';
import { 
  Newspaper, 
  Sparkles, 
  Hash, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Zap,
  Shield,
  Database,
  Target
} from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { newsApi, NewsItem } from '~/api/apiClient';
import { ImageWithFallback } from '~/shared/components/ImageWithFallback';
import { mapNewsItem } from '~/utils/news';

export function LandingPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [featuredNews, setFeaturedNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  const goToLoginForProduct = (productPath: string) => {
    navigate(`/login?return_url=${encodeURIComponent(productPath)}`);
  };

  const goToLoginForNews = () => {
    navigate(`/login?return_url=${encodeURIComponent('/news')}`);
  };

  // 获取展示新闻（10-20条）
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoadingNews(true);
        const result = await newsApi.getNews({ page: 1, limit: 24, language });
        setFeaturedNews(result.items || []);
      } catch (error) {
        console.error('Failed to fetch featured news:', error);
      } finally {
        setIsLoadingNews(false);
      }
    };
    fetchNews();
  }, []);

  // 根据语言获取标题
  const getTitle = () => {
    if (language === 'zh-CN') return 'AI新闻助手';
    return 'AI News Assistant';
  };

  const getSubtitle = () => {
    if (language === 'zh-CN') return '智能推荐 · 精准资讯';
    return 'Smart Recommendation · Precise News';
  };

  const getTagline = () => {
    if (language === 'zh-CN') return '让AI为您精选全球资讯，个性化推荐您感兴趣的新闻内容';
    return 'Let AI curate global news for you, with personalized recommendations tailored to your interests';
  };

  const features = [
    {
      icon: Newspaper,
      title: language === 'zh-CN' ? '新闻聚合'  : 'News Aggregation',
      description: language === 'zh-CN' 
        ? '汇聚全球优质新闻源，一站式获取最新资讯' 
         : 'Aggregate quality news sources from around the world, get the latest updates in one place'
    },
    {
      icon: Sparkles,
      title: language === 'zh-CN' ? 'AI阅读与总结'  : 'AI Reading & Summary',
      description: language === 'zh-CN'
        ? '智能AI分析新闻内容，提供精准摘要和关键信息'
         : 'AI-powered analysis of news content with precise summaries and key insights'
    },
    {
      icon: Hash,
      title: language === 'zh-CN' ? '关键词订阅'  : 'Keyword Subscription',
      description: language === 'zh-CN'
        ? '订阅您感兴趣的主题关键词，精准匹配相关新闻'
         : 'Subscribe to topics of interest, get precisely matched news articles'
    },
    {
      icon: Clock,
      title: language === 'zh-CN' ? '定时推送'  : 'Scheduled Push',
      description: language === 'zh-CN'
        ? '自定义推送时间，随时随地接收个性化新闻推送'
         : 'Customize push times and receive personalized news notifications anytime, anywhere'
    },
  ];

  const transformNewsItem = (item: any): NewsItem => {
    return mapNewsItem(item, {
      language,
      noTitle: language === 'zh-CN' ? '暂无标题' : 'Untitled',
      uncategorized: language === 'zh-CN' ? '未分类' : 'Uncategorized',
      unknownSource: language === 'zh-CN' ? '未知来源' : 'Unknown source',
    });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 导航条 */}
      <LandingNavigation />

      {/* Hero Section - 虚化拼色背景 */}
      <section className="hero-bg-blur relative pt-24 pb-16 sm:pt-32 sm:pb-20 bg-background">
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center gap-10 lg:gap-14"
          >
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
                {getTitle()}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-3 font-semibold">
                {getSubtitle()}
              </p>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {getTagline()}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start">
                <motion.div className="w-full max-w-[18.5rem] sm:w-auto sm:max-w-none" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ai-cta"
                    size="lg"
                    onClick={() => navigate('/login')}
                    className="w-full sm:w-auto sm:min-w-36 px-8 h-12 text-base font-semibold"
                  >
                    {language === 'zh-CN' ? '立即登录'  : 'Login Now'}
                  </Button>
                </motion.div>
                <motion.div className="w-full max-w-[18.5rem] sm:w-auto sm:max-w-none" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/register')}
                    className="w-full sm:w-auto sm:min-w-36 px-8 h-12 text-base font-semibold"
                  >
                    {language === 'zh-CN' ? '免费注册'  : 'Free Register'}
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* 右侧 AI 新闻预览卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <Card className="border border-border/60 shadow-[0_22px_60px_rgba(15,23,42,0.38)]">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-primary/80 uppercase tracking-wide">
                        {language === 'zh-CN' ? '实时 AI 摘要' : 'Realtime AI Summary'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {language === 'zh-CN'
                          ? '为您筛选今日最重要的 3 条新闻'
                          : 'Top 3 stories curated for you today'}
                      </p>
                    </div>
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>

                  <div className="space-y-3">
                    {[0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-primary/80">
                            {language === 'zh-CN' ? `智能要闻 0${index + 1}` : `Smart Brief 0${index + 1}`}
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/90" />
                        </div>
                        <div className="h-10 space-y-1.5 text-xs text-muted-foreground">
                          <div className="h-1.5 rounded-full bg-foreground/10" />
                          <div className="h-1.5 w-3/4 rounded-full bg-foreground/8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - 柔和背景 */}
      <section id="features" className="section-bg-soft py-16 sm:py-24 bg-muted/20 scroll-mt-16">
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {language === 'zh-CN' ? '核心功能'  : 'Core Features'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {language === 'zh-CN' 
                ? '强大的AI技术，为您提供智能化的新闻阅读体验' 
                 : 'Powerful AI technology for an intelligent news reading experience'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                >
                  <Card className="h-full border border-border hover:border-border/80 hover:shadow-sm transition-all duration-200">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg mb-3
                                      bg-primary/10 text-primary
                                      shadow-[0_0_0_1px_rgba(37,99,235,0.15),_0_2px_12px_rgba(37,99,235,0.12)]
                                      group-hover:shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_4px_20px_rgba(37,99,235,0.2)]
                                      transition-shadow duration-200">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1.5">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* 产品特性卡片 */}
          <div className="mt-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                {language === 'zh-CN' ? '三大产品'  : 'Three Products'}
              </h3>
              <p className="text-muted-foreground">
                {language === 'zh-CN'
                  ? '满足不同场景的新闻需求'
                   : 'Meet your news needs in different scenarios'}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 新闻推送 */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <Card className="h-full border border-border hover:border-border/80 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                  onClick={() => goToLoginForProduct('/home/news-push')}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg mb-4
                                    bg-primary/10 text-primary
                                    shadow-[0_0_0_1px_rgba(37,99,235,0.15),_0_2px_12px_rgba(37,99,235,0.12)]
                                    group-hover:shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_4px_20px_rgba(37,99,235,0.2)]
                                    transition-shadow duration-200">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {language === 'zh-CN' ? '新闻推送'  : 'News Push'}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {language === 'zh-CN'
                        ? '个性化定时推送，获取感兴趣的最新资讯，永不错过重要新闻。'
                         : 'Personalized scheduled push for the latest news you care about. Never miss important updates.'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                      {language === 'zh-CN' ? '登录使用'  : 'Login to Use'}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 新闻数据 */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.05 }}
              >
                <Card className="h-full border border-border hover:border-border/80 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                  onClick={() => goToLoginForProduct('/home/news-data')}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg mb-4
                                    bg-primary/10 text-primary
                                    shadow-[0_0_0_1px_rgba(37,99,235,0.15),_0_2px_12px_rgba(37,99,235,0.12)]
                                    group-hover:shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_4px_20px_rgba(37,99,235,0.2)]
                                    transition-shadow duration-200">
                      <Database className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {language === 'zh-CN' ? '新闻数据'  : 'News Data'}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {language === 'zh-CN'
                        ? '海量新闻数据库，支持高级搜索和数据导出，助力数据驱动决策。'
                         : 'Massive news database with advanced search and export. Power data-driven decisions.'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                      {language === 'zh-CN' ? '登录使用'  : 'Login to Use'}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 定向追踪 */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Card className="h-full border border-border hover:border-border/80 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                  onClick={() => goToLoginForProduct('/home/targeted-tracking')}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg mb-4
                                    bg-primary/10 text-primary
                                    shadow-[0_0_0_1px_rgba(37,99,235,0.15),_0_2px_12px_rgba(37,99,235,0.12)]
                                    group-hover:shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_4px_20px_rgba(37,99,235,0.2)]
                                    transition-shadow duration-200">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {language === 'zh-CN' ? '定向追踪'  : 'Targeted Tracking'}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                      {language === 'zh-CN'
                        ? '实时监控特定主题和品牌，快速获取竞争动态和舆情变化。'
                         : 'Real-time monitoring of topics and brands. Track competition and sentiment instantly.'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
                      {language === 'zh-CN' ? '登录使用'  : 'Login to Use'}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured News Section */}
      <section id="news" className="py-16 sm:py-24 bg-background scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {language === 'zh-CN' ? '精选新闻'  : 'Featured News'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {language === 'zh-CN'
                ? '实时更新的优质新闻内容，展示我们的新闻处理能力'
                 : 'Real-time updated quality news content, showcasing our news processing capabilities'}
            </p>
          </motion.div>

          {isLoadingNews ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('loading') || 'Loading...'}</p>
            </div>
          ) : featuredNews.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {featuredNews.slice(0, 12).map((item, index) => {
                  const newsItem = transformNewsItem(item);
                  return (
                    <motion.div
                      key={newsItem.id || index}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.06 }}
                    >
                      <Card 
                        className="h-full border border-border hover:border-border/80 hover:shadow-sm transition-all duration-200 cursor-pointer group overflow-hidden"
                        onClick={goToLoginForNews}
                      >
                        <CardContent className="p-0 flex flex-col h-full">
                          <div className="relative h-40 overflow-hidden bg-muted">
                            {newsItem.imageFallbackType === 'source_logo' ? (
                              <div className="w-full h-full flex items-center justify-center bg-muted/40 p-8">
                                <ImageWithFallback
                                  src={newsItem.imageUrl}
                                  alt={newsItem.source}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                            <ImageWithFallback
                              src={newsItem.imageUrl}
                              alt={newsItem.title}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            />
                            )}
                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                            <h3 className="font-semibold text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                              {newsItem.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
                              {newsItem.summary}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{newsItem.source}</span>
                              <span>{formatDate(newsItem.publishTime)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={goToLoginForNews}
                  className="inline-flex items-center gap-2"
                >
                  {language === 'zh-CN' ? '查看更多新闻'  : 'View More News'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {language === 'zh-CN' ? '暂无新闻'  : 'No news available'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="about" className="py-16 sm:py-24 bg-background scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {language === 'zh-CN' ? '为什么选择我们'  : 'Why Choose Us'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {language === 'zh-CN'
                ? '我们致力于为用户提供最好的新闻阅读体验'
                 : 'We are committed to providing users with the best news reading experience'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-lg mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {language === 'zh-CN' ? '实时更新'  : 'Real-time Updates'}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {language === 'zh-CN'
                  ? '每天自动更新新闻内容，确保信息时效性'
                   : 'Automatically updated daily to ensure information timeliness'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-lg mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {language === 'zh-CN' ? '智能推荐'  : 'Smart Recommendations'}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {language === 'zh-CN'
                  ? 'AI算法分析您的兴趣，精准推送相关内容'
                   : 'AI algorithms analyze your interests for precise content delivery'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-lg mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {language === 'zh-CN' ? '安全可靠'  : 'Secure & Reliable'}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {language === 'zh-CN'
                  ? '保护用户隐私，提供安全的使用环境'
                   : 'Protecting user privacy with a secure environment'}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section - 虚化拼色 */}
      <section
        id="contact"
        className="section-bg-cta py-16 sm:py-20 bg-background scroll-mt-16 border-t border-border/40"
      >
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {language === 'zh-CN' ? '准备好了吗？'  : 'Ready to Get Started?'}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {language === 'zh-CN'
                ? '立即加入，开启智能新闻阅读之旅，体验AI驱动的个性化推荐。'
                 : 'Join now and start your intelligent news reading journey with AI-powered personalized recommendations.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <motion.div className="w-full max-w-[18.5rem] sm:w-auto sm:max-w-none" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto sm:min-w-36 px-8 h-12 text-base font-semibold"
                >
                  {language === 'zh-CN' ? '立即登录'  : 'Login Now'}
                </Button>
              </motion.div>
              <motion.div className="w-full max-w-[18.5rem] sm:w-auto sm:max-w-none" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto sm:min-w-36 px-8 h-12 text-base font-semibold"
                >
                  {language === 'zh-CN' ? '免费注册'  : 'Free Register'}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
