import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Switch } from '~/shared/ui/switch';
import { ArrowLeft, Shield, Eye, MapPin, BarChart, Trash2 } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';

export function PrivacySettingsPage() {
  const navigate = useNavigate();
  const onBack = () => navigate('/profile');
  const { language, t } = useLanguage();
  const [locationTracking, setLocationTracking] = useState(false);
  const [readingHistory, setReadingHistory] = useState(true);
  const [personalizedAds, setPersonalizedAds] = useState(false);
  const [dataCollection, setDataCollection] = useState(true);
  const [analyticsSharing, setAnalyticsSharing] = useState(false);

  const heroDescription =
    language === 'zh-CN'
      ? '管理位置、阅读与数据共享等隐私选项'
       : 'Control location, reading data and privacy sharing options';

  const handleClearHistory = () => {
    console.log('Clear reading history');
  };

  const handleExportData = () => {
    console.log('Export user data');
  };

  const handleDeleteAccount = () => {
    console.log('Delete account');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('privacySettings')}
        description={heroDescription}
        icon={Shield}
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
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              {t('locationInformation')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('locationTracking')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('localizedNewsRecommendations')}</p>
              </div>
              <Switch checked={locationTracking} onCheckedChange={setLocationTracking} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              {t('readingData')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-4">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('saveReadingHistory')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('improveRecommendations')}</p>
              </div>
              <Switch checked={readingHistory} onCheckedChange={setReadingHistory} />
            </div>

            <div className="flex justify-between items-center gap-4 py-2 border-t border-border pt-4">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('clearReadingHistory')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('deleteAllReadingRecords')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearHistory}>
                {t('clear')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold">{t('adSettings')}</h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('personalizedAds')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('showRelevantAds')}</p>
              </div>
              <Switch checked={personalizedAds} onCheckedChange={setPersonalizedAds} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <BarChart className="w-5 h-5 text-primary" />
              </div>
              {t('dataCollection')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-4">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('useDataCollection')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('improveService')}</p>
              </div>
              <Switch checked={dataCollection} onCheckedChange={setDataCollection} />
            </div>

            <div className="flex justify-between items-center gap-4 py-2 border-t border-border pt-4">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('analyticsDataSharing')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('shareAnonymousAnalytics')}</p>
              </div>
              <Switch checked={analyticsSharing} onCheckedChange={setAnalyticsSharing} />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold">{t('dataManagement')}</h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('exportPersonalData')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('downloadPersonalDataCopy')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportData} className="rounded-xl">
                {t('export')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-destructive">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              {t('accountManagement')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <div className="flex justify-between items-center gap-4 py-2">
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('deleteAccount')}</p>
                <p className="text-muted-foreground text-sm mt-1">{t('permanentlyDeleteAccount')}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDeleteAccount} className="rounded-xl">
                {t('delete')}
              </Button>
            </div>
            <p className="text-destructive text-xs mt-3 font-medium">{t('warningIrreversible')}</p>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-6 space-y-3">
            <Button
              variant="outline"
              className="w-full rounded-xl h-11"
              onClick={() => navigate('/profile/privacy-policy')}
            >
              {t('viewPrivacyPolicy')}
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl h-11"
              onClick={() => navigate('/profile/terms')}
            >
              {t('viewUserAgreement')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
