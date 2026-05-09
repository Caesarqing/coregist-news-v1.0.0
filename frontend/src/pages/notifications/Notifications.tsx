import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, Newspaper } from 'lucide-react';
import { notificationApi, type AppNotification } from '~/api/apiClient';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';
import { Button } from '~/shared/ui/button';
import { Card, CardContent } from '~/shared/ui/card';
import { Badge } from '~/shared/ui/badge';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await notificationApi.list({ page: 1, limit: 50 });
      setItems(result.items || []);
      setUnreadCount(result.unreadCount || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const openNotification = async (item: AppNotification) => {
    if (!item.readAt) {
      try {
        await notificationApi.markRead(item.id);
      } catch {
        // Keep navigation available even if read state update fails.
      }
    }
    if (item.newsIds.length > 0) {
      navigate(`/home/news-push/${item.pushBatchId || item.id}/news?newsIds=${encodeURIComponent(item.newsIds.join(','))}`);
      return;
    }
    setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    await loadNotifications();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={language === 'zh-CN' ? '消息中心' : 'Notifications'}
        description={language === 'zh-CN' ? '查看你的新闻推送和站内提醒' : 'Review your news pushes and in-app alerts'}
        icon={Bell}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {language === 'zh-CN' ? `未读 ${unreadCount} 条` : `${unreadCount} unread`}
          </div>
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="mr-2 h-4 w-4" />
            {language === 'zh-CN' ? '全部已读' : 'Mark all read'}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              {language === 'zh-CN' ? '暂无消息' : 'No notifications yet'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openNotification(item)}
                className="block w-full text-left"
              >
                <Card className={`border transition-colors hover:border-primary/50 ${item.readAt ? 'border-border bg-card' : 'border-primary/40 bg-primary/5'}`}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="mt-1 rounded-lg bg-muted p-2">
                      <Newspaper className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        {!item.readAt && <Badge>{language === 'zh-CN' ? '未读' : 'Unread'}</Badge>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
                      <div className="mt-3 text-xs text-muted-foreground">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString(language === 'zh-CN' ? 'zh-CN' : 'en-US') : ''}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
