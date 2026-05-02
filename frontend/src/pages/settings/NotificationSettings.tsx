import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Switch } from '~/shared/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/shared/ui/select';
import { ArrowLeft, Bell, Smartphone, Volume2, Vibrate } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const onBack = () => navigate('/profile');
  const { language, t } = useLanguage();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [newsUpdates, setNewsUpdates] = useState(true);
  const [breakingNews, setBreakingNews] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');

  const heroDescription =
    language === 'zh-CN'
      ? '管理消息提醒、声音震动和免打扰时间'
       : 'Manage alerts, sound, vibration and quiet hours';

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('notificationSettings')}
        description={heroDescription}
        icon={Bell}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
        </div>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              {t('pushNotifications')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <div className="flex justify-between items-center py-2 gap-4">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('enablePushNotifications')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('receiveAppNotifications')}</p>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold">{t('notificationTypes')}</h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-4">
            <div className="flex justify-between items-center py-2 gap-4">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('newsUpdates')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('personalizedNewsNotifications')}</p>
              </div>
              <Switch checked={newsUpdates && pushEnabled} onCheckedChange={setNewsUpdates} disabled={!pushEnabled} />
            </div>

            <div className="flex justify-between items-center py-2 border-t border-border pt-4 gap-4">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('breakingNews')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('importantBreakingNewsPush')}</p>
              </div>
              <Switch checked={breakingNews && pushEnabled} onCheckedChange={setBreakingNews} disabled={!pushEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              {t('notificationStyle')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-4">
            <div className="flex justify-between items-center py-2 gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground font-medium">{t('notificationSound')}</p>
                  <p className="text-muted-foreground text-sm mt-1">{t('playNotificationSound')}</p>
                </div>
              </div>
              <Switch checked={soundEnabled && pushEnabled} onCheckedChange={setSoundEnabled} disabled={!pushEnabled} />
            </div>

            <div className="flex justify-between items-center py-2 border-t border-border pt-4 gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Vibrate className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-foreground font-medium">{t('vibrationAlert')}</p>
                  <p className="text-muted-foreground text-sm mt-1">{t('vibrateOnNotification')}</p>
                </div>
              </div>
              <Switch checked={vibrationEnabled && pushEnabled} onCheckedChange={setVibrationEnabled} disabled={!pushEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold">{t('quietHours')}</h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-4">
            <div className="flex justify-between items-center py-2 gap-4">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('enableQuietHours')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('muteNotificationsInTimeRange')}</p>
              </div>
              <Switch checked={quietHours && pushEnabled} onCheckedChange={setQuietHours} disabled={!pushEnabled} />
            </div>

            {quietHours && pushEnabled && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center gap-4">
                  <p className="text-foreground font-medium">{t('startTime')}</p>
                  <Select value={quietStart} onValueChange={setQuietStart}>
                    <SelectTrigger className="w-32 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <p className="text-foreground font-medium">{t('endTime')}</p>
                  <Select value={quietEnd} onValueChange={setQuietEnd}>
                    <SelectTrigger className="w-32 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
