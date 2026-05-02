import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Input } from '~/shared/ui/input';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookmarkPlus,
  Check,
  Database,
  Download,
  Eye,
  Grid,
  List,
  Search,
} from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { PageHero } from '~/shared/components/PageHero';
import { newsApi } from '~/api/apiClient';
import {
  type NewsDataItem,
  getDayDiff,
  toNewsDataItem,
} from '~/features/news-data/model';
import { newsDataMock } from '~/features/news-data/mock';
import { getNewsDataItems, getMySpaceIds, setNewsDataItems, setMySpaceIds } from '~/features/news-data/storage';

type ViewMode = 'list' | 'grid';
type RankMode = 'week' | 'month' | null;
type DateFilterMode = 'all' | 'today';

export function NewsDataPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const isZh = language === 'zh-CN';

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [rankMode, setRankMode] = useState<RankMode>(null);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [newsItems, setNewsItems] = useState<NewsDataItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mySpaceIds, setMySpaceIdsState] = useState<string[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  useEffect(() => {
    const loadNewsData = async () => {
      try {
        const result = await newsApi.getNews({ page: 1, limit: 200, language });
        const transformed = (result.items || []).map(toNewsDataItem).filter((x) => x.id);
        if (transformed.length > 0) {
          setNewsItems(transformed);
          setNewsDataItems(transformed);
        } else {
          const cached = getNewsDataItems();
          setNewsItems(cached.length ? cached : newsDataMock);
        }
      } catch {
        const cached = getNewsDataItems();
        setNewsItems(cached.length ? cached : newsDataMock);
      }
    };

    loadNewsData();
    setMySpaceIdsState(getMySpaceIds());
  }, [language]);

  useEffect(() => {
    setMySpaceIds(mySpaceIds);
  }, [mySpaceIds]);

  const todayDate = new Date().toISOString().split('T')[0];

  const todayCount = useMemo(
    () => newsItems.filter((item) => item.uploadDate === todayDate).length,
    [newsItems, todayDate]
  );

  const visibleNews = useMemo(() => {
    let base = [...newsItems];

    if (dateFilterMode === 'today') {
      base = base.filter((item) => item.uploadDate === todayDate);
    }

    if (rankMode === 'week') {
      base = base
        .filter((item) => {
          const diff = getDayDiff(item.uploadDate);
          return diff >= 0 && diff <= 7;
        })
        .sort((a, b) => b.downloads - a.downloads);
    } else if (rankMode === 'month') {
      base = base
        .filter((item) => {
          const diff = getDayDiff(item.uploadDate);
          return diff >= 0 && diff <= 30;
        })
        .sort((a, b) => b.downloads - a.downloads);
    } else {
      base = base.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
    }

    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return base;

    return base.filter(
      (item) =>
        item.headline.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(keyword))
    );
  }, [newsItems, rankMode, searchKeyword, dateFilterMode, todayDate]);

  const visibleIds = visibleNews.map((item) => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const handleToggleRank = (mode: 'week' | 'month') => {
    setRankMode((prev) => (prev === mode ? null : mode));
  };

  const handleSearch = () => {
    setSearchKeyword(searchInput.trim());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const importSelectedToMySpace = () => {
    if (selectedIds.length === 0) {
      return;
    }
    setMySpaceIdsState((prev) => Array.from(new Set([...prev, ...selectedIds])));
  };

  const importSingleToMySpace = (id: string) => {
    setMySpaceIdsState((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const downloadItemsToLocal = (items: NewsDataItem[], filename: string) => {
    const headers = isZh
      ? ['大标题', '标签', '上传日期', '描述', '下载量', '浏览量']
      : ['Headline', 'Tags', 'Upload Date', 'Description', 'Downloads', 'Views'];
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = items.map((item) => [
      escape(item.headline),
      escape(item.tags.join('|')),
      escape(item.uploadDate),
      escape(item.description),
      escape(item.downloads),
      escape(item.views),
    ]);
    const csv = [headers.map(escape).join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadSelectedToLocal = () => {
    const selectedItems = newsItems.filter((item) => selectedIds.includes(item.id));
    if (selectedItems.length === 0) {
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    const filename = `news-data-selected-${date}.csv`;
    downloadItemsToLocal(selectedItems, filename);
    setDownloadedIds((prev) => Array.from(new Set([...prev, ...selectedItems.map((item) => item.id)])));
  };

  const handleDownloadItem = (item: NewsDataItem) => {
    const date = new Date().toISOString().slice(0, 10);
    const filename = `news-data-${item.id}-${date}.csv`;
    downloadItemsToLocal([item], filename);
    setDownloadedIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
  };

  const heroDescription = isZh
    ? '总数据库检索、周榜/月榜查看、批量选择与存入我的空间'
    : 'Database search, weekly/monthly ranking, batch select and My Space import';
  const itemActionButtonClass = 'h-9 min-w-[124px] px-3 rounded-lg justify-center whitespace-nowrap text-sm';

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('newsData')}
        description={heroDescription}
        icon={Database}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/home')}
          className="rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <button
            type="button"
            onClick={() => setDateFilterMode('all')}
            className={`lg:col-span-3 rounded-2xl border-2 text-left transition-all duration-200 p-4 sm:p-5 ${
              dateFilterMode === 'all'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold uppercase">
              {isZh ? '总数据库' : 'Total Database'}
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-primary mt-2">{newsItems.length}</p>
          </button>

          <button
            type="button"
            onClick={() =>
              setDateFilterMode((prev) => (prev === 'today' ? 'all' : 'today'))
            }
            className={`lg:col-span-3 rounded-2xl border-2 text-left transition-all duration-200 p-4 sm:p-5 ${
              dateFilterMode === 'today'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold uppercase">
              {isZh ? '今日更新' : 'Today Updates'}
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-primary mt-2">{todayCount}</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/home/news-data/my-space')}
            className="lg:col-span-6 rounded-2xl border-2 border-primary bg-gradient-to-r from-primary to-primary/80 text-left text-primary-foreground shadow-sm hover:border-primary hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
          >
            <div className="p-5 sm:p-6 h-full flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm uppercase tracking-wide text-primary-foreground/80 font-semibold">
                  {isZh ? '我的空间' : 'My Space'}
                </p>
                <p className="text-2xl sm:text-3xl font-bold mt-2">{mySpaceIds.length}</p>
                <p className="text-xs sm:text-sm text-primary-foreground/80 mt-2">
                  {isZh ? '进入查看我保存的数据' : 'View saved data'}
                </p>
              </div>
              <ArrowRight className="w-6 h-6 shrink-0" />
            </div>
          </button>
        </div>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  placeholder={isZh ? '搜索大标题、标签或描述...' : 'Search headline, tags, or description...'}
                  className="pl-9 rounded-xl border-border"
                />
              </div>
              <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSearch}>
                <Search className="w-4 h-4 mr-1" />
                {isZh ? '搜索' : 'Search'}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
              <div className="flex gap-2">
                <Button
                  variant={rankMode === 'week' ? 'default' : 'outline'}
                  size="sm"
                  className={`rounded-lg ${rankMode === 'week' ? 'bg-primary text-primary-foreground' : 'border-border'}`}
                  onClick={() => handleToggleRank('week')}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  {isZh ? '周榜' : 'Weekly Rank'}
                </Button>
                <Button
                  variant={rankMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  className={`rounded-lg ${rankMode === 'month' ? 'bg-primary text-primary-foreground' : 'border-border'}`}
                  onClick={() => handleToggleRank('month')}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  {isZh ? '月榜' : 'Monthly Rank'}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`rounded-lg ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'border-border'}`}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`rounded-lg ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'border-border'}`}
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-muted/20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-5 text-sm text-foreground">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {isZh ? '已选' : 'Selected'}{' '}
                  <span className="font-bold text-foreground">{selectedIds.length}</span>
                  {isZh ? '条' : ''}
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {isZh ? '已存入' : 'Saved'}{' '}
                  <span className="font-bold text-foreground">{mySpaceIds.length}</span>
                  {isZh ? '条' : ''}
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {isZh ? '已下载' : 'Downloaded'}{' '}
                  <span className="font-bold text-foreground">{downloadedIds.length}</span>
                  {isZh ? '条' : ''}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 rounded-lg ${
                    allVisibleSelected
                      ? 'border-primary/50 text-primary bg-primary/5'
                      : 'border-border text-foreground'
                  }`}
                  onClick={toggleSelectAllVisible}
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
                  onClick={importSelectedToMySpace}
                  disabled={selectedIds.length === 0}
                >
                  <BookmarkPlus className="w-4 h-4 mr-1" />
                  {isZh ? '存入我的空间' : 'Save to My Space'}
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

        {viewMode === 'list' ? (
          <div className="space-y-3">
            {visibleNews.length > 0 ? (
              visibleNews.map((item, index) => {
                const selected = selectedIds.includes(item.id);
                const inMySpace = mySpaceIds.includes(item.id);
                const isDownloaded = downloadedIds.includes(item.id);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                  >
                    <Card
                      className={`border-border transition-all hover:shadow-md cursor-pointer ${
                        selected ? 'ring-2 ring-primary/30 border-primary/50' : 'hover:border-blue-600'
                      }`}
                      onClick={() => navigate(`/home/news-data/${item.id}`)}
                    >
                      <CardContent className="p-4 sm:p-6 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2 min-w-0">
                            <h3 className="text-xl font-bold text-foreground">{item.headline}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                              {item.tags.map((tag) => (
                                <span
                                  key={`${item.id}-${tag}`}
                                  className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-semibold"
                                >
                                  {tag}
                                </span>
                              ))}
                              <span className="text-xs text-muted-foreground">{item.uploadDate}</span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Download className="w-3.5 h-3.5" />
                                {isZh ? '下载量' : 'Downloads'} {item.downloads}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                {isZh ? '浏览量' : 'Views'} {item.views}
                              </span>
                              {inMySpace && <span className="text-primary">{isZh ? '已在我的空间' : 'In My Space'}</span>}
                              {isDownloaded && <span className="text-primary">{isZh ? '已下载' : 'Downloaded'}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant={selected ? 'default' : 'outline'}
                              className={`${itemActionButtonClass} ${selected ? 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700' : 'border-slate-200'}`}
                              onClick={() => toggleSelect(item.id)}
                            >
                              {selected ? (isZh ? '已选择' : 'Selected') : (isZh ? '选择' : 'Select')}
                            </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className={`${itemActionButtonClass} border-slate-200`}
                                onClick={() => importSingleToMySpace(item.id)}
                              >
                                {isZh ? '存入我的空间' : 'Save'}
                              </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={`${itemActionButtonClass} border-slate-200`}
                              onClick={() => handleDownloadItem(item)}
                            >
                              {isZh ? '下载' : 'Download'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <Card className="border-slate-200">
                <CardContent className="p-10 text-center text-gray-500">
                  {isZh ? '没有匹配的数据。' : 'No matching data found.'}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleNews.length > 0 ? (
              visibleNews.map((item, index) => {
                const selected = selectedIds.includes(item.id);
                const inMySpace = mySpaceIds.includes(item.id);
                const isDownloaded = downloadedIds.includes(item.id);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                  >
                    <Card
                      className={`h-full border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer ${
                        selected ? 'ring-2 ring-indigo-300 border-indigo-300' : ''
                      }`}
                      onClick={() => navigate(`/home/news-data/${item.id}`)}
                    >
                      <CardContent className="p-4 sm:p-5 space-y-3 h-full flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900">{item.headline}</h3>
                        <div className="flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span key={`${item.id}-grid-${tag}`} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">{item.uploadDate}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                        <div className="mt-auto pt-2 text-xs text-slate-600 space-y-1">
                          <p>{isZh ? '下载量' : 'Downloads'}: {item.downloads}</p>
                          <p>{isZh ? '浏览量' : 'Views'}: {item.views}</p>
                          {(inMySpace || isDownloaded) && (
                            <p className="space-x-3">
                              {inMySpace && <span className="text-indigo-600">{isZh ? '已在我的空间' : 'In My Space'}</span>}
                              {isDownloaded && <span className="text-indigo-600">{isZh ? '已下载' : 'Downloaded'}</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant={selected ? 'default' : 'outline'}
                            className={`${itemActionButtonClass} flex-1 ${selected ? 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700' : 'border-slate-200'}`}
                            onClick={() => toggleSelect(item.id)}
                          >
                            {selected ? (isZh ? '已选择' : 'Selected') : (isZh ? '选择' : 'Select')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`${itemActionButtonClass} flex-1 border-slate-200`}
                            onClick={() => handleDownloadItem(item)}
                          >
                            {isZh ? '下载' : 'Download'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`${itemActionButtonClass} flex-1 border-slate-200`}
                            onClick={() => importSingleToMySpace(item.id)}
                          >
                            {isZh ? '存入我的空间' : 'Save'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full">
                <Card className="border-slate-200">
                  <CardContent className="p-10 text-center text-gray-500">
                    {isZh ? '没有匹配的数据。' : 'No matching data found.'}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
