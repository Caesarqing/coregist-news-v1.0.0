import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Zap, Database, Target, ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { PageHero } from '~/shared/components/PageHero';

const products = [
  {
    id: 'news-push',
    path: '/home/news-push',
    icon: Zap,
    titleKey: 'newsPush',
    desc: {
      'zh-CN': '定制您的个性化新闻推送，通过时间、数量、关键词等设置完成相关新闻的精准推送',
      'en': 'Customize personalized news push with time, quantity, keywords and more for precise delivery',
    },
  },
  {
    id: 'news-data',
    path: '/home/news-data',
    icon: Database,
    titleKey: 'newsData',
    desc: {
      'zh-CN': '深度分析新闻趋势和热点话题，支持多种格式的数据导出',
      'en': 'Deep analysis of news trends and hot topics, support multi-format data export',
    },
  },
  {
    id: 'targeted-tracking',
    path: '/home/targeted-tracking',
    icon: Target,
    titleKey: 'targetedTracking',
    desc: {
      'zh-CN': '跟踪特定网站和主题的新闻更新，实时监测竞品与行业动态',
      'en': 'Track news updates from specific sites and topics, monitor competitors and industry',
    },
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const heroDescription =
    language === 'zh-CN'
      ? '汇聚新闻推送、数据分析与定向追踪等 AI 能力，一站式满足您的信息需求'
       : 'AI-powered news push, data analysis and targeted tracking in one place';

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('aiProductCenter')}
        description={heroDescription}
        icon={Sparkles}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, index) => {
            const Icon = product.icon;
            const desc =
              product.desc[language as keyof typeof product.desc] || product.desc['en'];
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                className="h-full"
              >
                <Card
                  className="group h-full min-h-[280px] border border-border/70 hover:border-ring/60 transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(product.path)}
                >
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl mb-4
                                    bg-primary/10 text-primary
                                    shadow-[0_0_0_1px_rgba(37,99,235,0.15),_0_2px_12px_rgba(37,99,235,0.12)]
                                    group-hover:shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_4px_20px_rgba(37,99,235,0.2)]
                                    transition-shadow duration-200">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {t(product.titleKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-1">{desc}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-auto inline-flex w-fit items-center gap-1 text-primary font-medium text-sm px-0
                                 group-hover:gap-2 group-hover:text-primary/90 transition-all duration-200"
                    >
                      {language === 'zh-CN' ? '进入' : 'Enter'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
