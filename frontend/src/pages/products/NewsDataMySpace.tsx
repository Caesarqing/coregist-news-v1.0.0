import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { ArrowLeft, CalendarDays, Database, Download, Trash2, Eye, Check } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';
import {
  type NewsDataItem,
} from '~/features/news-data/model';
import { newsDataMock } from '~/features/news-data/mock';
import { getNewsDataItems, getMySpaceIds, setMySpaceIds } from '~/features/news-data/storage';

export function NewsDataMySpacePage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isZh = language === 'zh-CN';

  const [mySpaceIds, setMySpaceIdsState] = useState<string[]>([]);
  // Selected items for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Track downloaded items in this page (optional UX hint)
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [detailItem, setDetailItem] = useState<NewsDataItem | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [allItems, setAllItems] = useState<NewsDataItem[]>(newsDataMock);
  const itemActionButtonClass = 'h-9 min-w-[124px] px-3 rounded-lg justify-center whitespace-nowrap text-sm';

  useEffect(() => {
    setMySpaceIdsState(getMySpaceIds());
    const cachedItems = getNewsDataItems();
    if (cachedItems.length > 0) {
      setAllItems(cachedItems);
    }
  }, []);

  const myItems = useMemo(() => {
    return allItems
      .filter((item) => mySpaceIds.includes(item.id))
      .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
  }, [mySpaceIds, allItems]);

  const removeItem = (id: string) => {
    const next = mySpaceIds.filter((itemId) => itemId !== id);
    setMySpaceIdsState(next);
    setMySpaceIds(next);
    if (detailItem?.id === id) {
      setDetailItem(null);
    }
    setActionMessage(isZh ? '已从我的空间移除。' : 'Removed from My Space.');
  };

  const clearAll = () => {
    setMySpaceIdsState([]);
    setMySpaceIds([]);
    setDetailItem(null);
    setActionMessage(isZh ? '我的空间已清空。' : 'My Space has been cleared.');
  };

  // Toggle selection for batch download
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };
  // Compute visible IDs and overall select-all state for current view
  const visibleIds = myItems.map((it) => it.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  // Select / Deselect all current myItems
  const toggleSelectAllMyItems = () => {
    const ids = myItems.map((it) => it.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  // Download a list of items to a single CSV file
  const downloadItemsToLocal = (items: NewsDataItem[], filename: string) => {
    const escapeCSV = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const headers = isZh ? ['大标题','标签','上传日期','描述','下载量','浏览量'] : ['Headline','Tags','Upload Date','Description','Downloads','Views'];
    const rows = items.map((it) => [it.headline, it.tags.join('|'), it.uploadDate, it.description, it.downloads, it.views]);
    const csv = [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Batch download selected items
  const downloadSelectedToLocal = () => {
    const items = myItems.filter((it) => selectedIds.includes(it.id));
    if (items.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    const filename = `news-data-my-space-selected-${date}.csv`;
    downloadItemsToLocal(items, filename);
    setDownloadedIds((prev) => Array.from(new Set([...prev, ...items.map((it) => it.id)])));
  };

  const exportItem = (item: NewsDataItem) => {
    // Download as CSV for a single item
    const escapeCSV = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const headers = isZh ? ['大标题','标签','上传日期','描述','下载量','浏览量'] : ['Headline','Tags','Upload Date','Description','Downloads','Views'];
    const row = [item.headline, item.tags.join('|'), item.uploadDate, item.description, item.downloads, item.views];
    const csv = [headers.map(escapeCSV).join(','), row.map(escapeCSV).join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `news-data-my-space-${item.id}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setActionMessage(isZh ? `已下载：${item.headline}（示例）` : `Downloaded: ${item.headline} (demo)`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={isZh ? '我的空间' : 'My Space'}
        description={isZh ? '查看和管理你保存的新闻数据条目' : 'View and manage your saved news data items'}
        icon={Database}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/home/news-data')}
          className="rounded-xl border-slate-200 bg-white hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isZh ? '返回' : 'Back'}
        </Button>
        {myItems.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {isZh ? '清空我的空间' : 'Clear My Space'}
          </Button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <Card className="border-border bg-muted/20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-5 text-sm text-foreground">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {isZh ? '已保存数据' : 'Saved'}{' '}
                  <span className="font-bold text-foreground">{myItems.length}</span>
                  {isZh ? '条' : ''}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-foreground">
                  {isZh ? '已选数据' : 'Selected'}{' '}
                  <span className="font-bold text-foreground">{selectedIds.length}</span>
                  {isZh ? '条' : ''}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 rounded-lg ${
                    allVisibleSelected
                      ? 'border-primary/50 text-primary bg-primary/5'
                      : 'border-border text-foreground'
                  }`}
                  onClick={toggleSelectAllMyItems}
                  disabled={visibleIds.length === 0}
                >
                  <span
                    className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-sm border ${
                      allVisibleSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-transparent'
                    }`}
                  >
                    {allVisibleSelected && <Check className="h-3 w-3" />}
                  </span>
                  {isZh ? '全选' : 'Select All'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg border-border bg-card text-foreground hover:bg-muted"
                  onClick={downloadSelectedToLocal}
                  disabled={selectedIds.length === 0}
                >
                  <Download className="w-4 h-4 mr-1" />
                  {isZh ? '下载' : 'Download'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {detailItem && (
          <Card className="border-indigo-200 bg-indigo-50/50">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-gray-900">
                  {isZh ? '数据详情' : 'Data Detail'} · {detailItem.headline}
                </h3>
                <Button variant="outline" size="sm" onClick={() => setDetailItem(null)}>
                  {isZh ? '关闭' : 'Close'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {detailItem.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-700">{detailItem.detail}</p>
              <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {detailItem.uploadDate}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  {isZh ? '下载量' : 'Downloads'} {detailItem.downloads}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {isZh ? '浏览量' : 'Views'} {detailItem.views}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {myItems.length > 0 ? (
          <div className="space-y-3">
            {myItems.map((item) => (
              <Card 
                key={item.id} 
                className="border-border transition-all hover:shadow-md cursor-pointer hover:border-blue-600"
                onClick={() => navigate(`/home/news-data/my-space/${item.id}`)}
              >
                <CardContent className="p-4 sm:p-6 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                        {item.headline}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.tags.map((tag) => (
                          <span key={`${item.id}-${tag}`} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                            {tag}
                          </span>
                        ))}
                        <span className="text-xs text-gray-500">{item.uploadDate}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">{item.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          {isZh ? '下载量' : 'Downloads'} {item.downloads}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {isZh ? '浏览量' : 'Views'} {item.views}
                        </span>
                    </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant={selectedIds.includes(item.id) ? 'default' : 'outline'}
                        className={`${itemActionButtonClass} ${selectedIds.includes(item.id) ? 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700' : 'border-slate-200'}`}
                        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                      >
                        <span
                          className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-sm border ${
                            selectedIds.includes(item.id)
                              ? 'border-primary-foreground/70 bg-primary-foreground/15 text-primary-foreground'
                              : 'border-border bg-background text-transparent'
                          }`}
                        >
                          {selectedIds.includes(item.id) && <Check className="h-3 w-3" />}
                        </span>
                        {selectedIds.includes(item.id) ? (isZh ? '已选择' : 'Selected') : (isZh ? '选择' : 'Select')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${itemActionButtonClass} border-slate-200`}
                        onClick={() => exportItem(item)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {isZh ? '下载' : 'Download'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${itemActionButtonClass} border-red-200 text-red-600 hover:bg-red-50`}
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {isZh ? '删除' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center text-gray-500">
              {isZh ? '我的空间暂无数据，请先从新闻数据页存入。' : 'My Space is empty. Save data from News Data page first.'}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
