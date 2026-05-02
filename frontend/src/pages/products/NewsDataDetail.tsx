import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { ArrowLeft, CalendarDays, Download, Eye, BookmarkPlus, Check } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';
import {
  type NewsDataItem,
} from '~/features/news-data/model';
import { newsDataMock } from '~/features/news-data/mock';
import { getNewsDataItems, getMySpaceIds, setMySpaceIds } from '~/features/news-data/storage';

export function NewsDataDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const isZh = language === 'zh-CN';

  const [item, setItem] = useState<NewsDataItem | null>(null);
  const [mySpaceIds, setMySpaceIdsState] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    setMySpaceIdsState(getMySpaceIds());
    const cachedItems = getNewsDataItems();
    const allItems = cachedItems.length > 0 ? cachedItems : newsDataMock;
    const foundItem = allItems.find((item) => item.id === id);
    setItem(foundItem || null);
  }, [id]);

  const isInMySpace = item ? mySpaceIds.includes(item.id) : false;

  const addToMySpace = () => {
    if (!item) return;
    const next = [...mySpaceIds, item.id];
    setMySpaceIdsState(next);
    setMySpaceIds(next);
    setActionMessage(isZh ? '已添加到我的空间' : 'Added to My Space');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const downloadItem = () => {
    if (!item) return;
    const headers = isZh
      ? ['大标题', '标签', '上传日期', '描述', '下载量', '浏览量']
      : ['Headline', 'Tags', 'Upload Date', 'Description', 'Downloads', 'Views'];
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const row = [
      escape(item.headline),
      escape(item.tags.join('|')),
      escape(item.uploadDate),
      escape(item.description),
      escape(item.downloads),
      escape(item.views),
    ];
    const csv = [headers.map(escape).join(','), row.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `news-data-${item.id}-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setActionMessage(isZh ? '已下载' : 'Downloaded');
    setTimeout(() => setActionMessage(''), 3000);
  };

  if (!item) {
    return (
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-muted-foreground">{isZh ? '数据不存在' : 'Data not found'}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/home/news-data')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isZh ? '返回' : 'Back'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={isZh ? '数据详情' : 'Data Detail'}
        description={isZh ? '查看新闻数据的完整信息' : 'View complete news data information'}
        icon={Eye}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isZh ? '返回' : 'Back'}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {actionMessage && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-4 text-center text-primary font-medium">
              {actionMessage}
            </CardContent>
          </Card>
        )}

        <Card className="border-border">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {item.headline}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-t border-b border-border py-4">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                {item.uploadDate}
              </span>
              <span className="inline-flex items-center gap-2">
                <Download className="w-4 h-4" />
                {isZh ? '下载量' : 'Downloads'}: {item.downloads}
              </span>
              <span className="inline-flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {isZh ? '浏览量' : 'Views'}: {item.views}
              </span>
              {isInMySpace && (
                <span className="inline-flex items-center gap-2 text-primary">
                  <Check className="w-4 h-4" />
                  {isZh ? '已在我的空间' : 'In My Space'}
                </span>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {isZh ? '描述' : 'Description'}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {isZh ? '详细内容' : 'Detailed Content'}
              </h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {item.detail}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
              <Button
                onClick={addToMySpace}
                disabled={isInMySpace}
                className="rounded-lg"
              >
                <BookmarkPlus className="w-4 h-4 mr-2" />
                {isInMySpace
                  ? (isZh ? '已在我的空间' : 'In My Space')
                  : (isZh ? '添加到我的空间' : 'Add to My Space')}
              </Button>
              <Button
                variant="outline"
                onClick={downloadItem}
                className="rounded-lg"
              >
                <Download className="w-4 h-4 mr-2" />
                {isZh ? '下载数据' : 'Download Data'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
