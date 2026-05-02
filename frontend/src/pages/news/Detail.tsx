import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '~/shared/ui/badge';
import { Button } from '~/shared/ui/button';
import { Card, CardContent } from '~/shared/ui/card';
import { ImageWithFallback } from '~/shared/components/ImageWithFallback';
import { newsApi, type NewsItem } from '~/api/apiClient';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';
import { ArrowLeft, ExternalLink, Loader2, Newspaper } from 'lucide-react';
import { mapNewsItem } from '~/utils/news';

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const transformNewsItem = useCallback(
    (raw: any): NewsItem =>
      mapNewsItem(raw, {
        language,
        noTitle: t('noTitle'),
        uncategorized: t('uncategorized'),
        unknownSource: t('unknownSource'),
      }),
    [language, t]
  );

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const detail = await newsApi.getNewsDetail(id, language);
      setItem(transformNewsItem(detail));
    } catch (err: any) {
      setError(err?.message || (language === 'zh-CN' ? '加载新闻详情失败' : 'Failed to load news detail'));
      setItem(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, language, transformNewsItem]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const formattedDate = item?.publishTime
    ? new Date(item.publishTime).toLocaleString(language === 'zh-CN' ? 'zh-CN' : 'en-US')
    : '-';

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('newsDetail')}
        description={language === 'zh-CN' ? '查看完整新闻内容与来源信息' : 'Read full news summary and source information'}
        icon={Newspaper}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/news')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('backToNewsCenter')}
        </Button>

        {isLoading ? (
          <Card className="border border-border">
            <CardContent className="p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border border-destructive/50">
            <CardContent className="p-6 text-destructive">{error}</CardContent>
          </Card>
        ) : item ? (
            <Card className="border border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="h-64 sm:h-80 bg-muted">
                {item.imageFallbackType === 'source_logo' ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted/40 p-10">
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
                  className="w-full h-full object-cover"
                />
                )}
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                  <span className="text-sm text-muted-foreground">{formattedDate}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                  {item.title}
                </h1>

                <div className="space-y-4 text-foreground/90 leading-7">
                  <p>{item.fullContent || item.summary}</p>
                </div>

                <div className="pt-4 border-t border-border space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {language === 'zh-CN' ? '报道媒体：' : 'Media: '}
                    </span>
                    {item.source || t('unknownSource')}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {language === 'zh-CN' ? '发布时间：' : 'Published: '}
                    </span>
                    {formattedDate}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{t('originalLink')} </span>
                    {item.sourceLink ? (
                      <a
                        href={item.sourceLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                      >
                        {item.sourceLink}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
