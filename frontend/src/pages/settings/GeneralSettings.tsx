import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Switch } from '~/shared/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/shared/ui/select';
import { ArrowLeft, Globe, Moon, Smartphone, Settings, HardDrive } from 'lucide-react';
import { userSettingsApi } from '~/api/apiClient';
import { useLanguage, translateWithParams } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';
import { useTheme } from 'next-themes';

export function GeneralSettingsPage() {
  const navigate = useNavigate();
  const onBack = () => navigate('/profile');
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);
  const darkMode = resolvedTheme === 'dark';

  const heroDescription =
    language === 'zh-CN'
      ? '管理应用语言、主题、更新与存储等基础配置'
      : 'Manage language, theme, updates and storage preferences';

  const handleLanguageChange = async (newLanguage: 'zh-CN' | 'en') => {
    setLanguage(newLanguage);
    try {
      await userSettingsApi.updateLanguage(newLanguage);
    } catch (error) {
      console.warn('Sync language setting failed:', error);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('generalSettings')}
        description={heroDescription}
        icon={Settings}
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
                <Globe className="w-5 h-5 text-primary" />
              </div>
              {t('languageAndRegion')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('applicationLanguage')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('selectApplicationLanguage')}</p>
              </div>
              <Select value={language} onValueChange={(value) => handleLanguageChange(value as 'zh-CN' | 'en')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">{t('simplifiedChinese')}</SelectItem>
                  <SelectItem value="en">{t('english')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Moon className="w-5 h-5 text-primary" />
              </div>
              {t('themeSettings')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('darkMode')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('reduceEyeStrain')}</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              {t('applicationUpdates')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-4">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('automaticUpdates')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('autoDownloadAndInstall')}</p>
              </div>
              <Switch checked={autoUpdate} onCheckedChange={setAutoUpdate} />
            </div>

            <div className="flex justify-between items-center gap-4 py-2 border-t border-border pt-4">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('wifiOnlyDownload')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('downloadOnlyOnWifi')}</p>
              </div>
              <Switch checked={wifiOnly} onCheckedChange={setWifiOnly} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <HardDrive className="w-5 h-5 text-primary" />
              </div>
              {t('storageManagement')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-4">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('appCache')}</p>
                <p className="text-muted-foreground text-sm mt-1">{translateWithParams(t, 'currentCacheSize', { size: '125.6 MB' })}</p>
              </div>
              <Button variant="outline" size="sm">
                {t('clearCache')}
              </Button>
            </div>

            <div className="flex justify-between items-center gap-4 py-2 border-t border-border pt-4">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('offlineNews')}</p>
                <p className="text-muted-foreground text-sm mt-1">{translateWithParams(t, 'savedArticles', { count: '45' })}</p>
              </div>
              <Button variant="outline" size="sm">
                {t('manage')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
