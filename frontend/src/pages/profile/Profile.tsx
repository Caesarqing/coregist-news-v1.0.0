import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '~/shared/ui/avatar';
import { ChevronRight, Settings, Bell, Shield, HelpCircle, LogOut, User, Coins } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { authApi } from '~/api/apiClient';
import { PageHero } from '~/shared/components/PageHero';

export function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setUsername(user.username || user.name || '');
        setBio(user.bio || '');
        setAvatar(user.avatar || user.avatar_url || '');
      } catch (error) {
        console.error('加载用户信息失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserInfo();
  }, []);
  
  const handleLogout = () => {
    // 清空存储的认证信息并跳转到登录页
    localStorage.clear();
    navigate('/login');
  };

  const onNavigate = (section: string) => {
    switch (section) {
      case 'edit-profile':
        navigate('/profile/edit-profile');
        break;
      case 'general-settings':
        navigate('/profile/general');
        break;
      case 'notifications':
        navigate('/profile/notification');
        break;
      case 'privacy':
        navigate('/profile/privacy');
        break;
      case 'help-feedback':
        navigate('/profile/help');
        break;
      default:
        break;
    }
  };

  const profileName = isLoading ? t('loading') : (username || 'User');

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('personalCenter')}
        description={t('manageAccountSettings')}
        icon={User}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <Card
          className="border border-border hover:shadow-sm transition-all duration-200 cursor-pointer"
          onClick={() => onNavigate('edit-profile')}
        >
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-4 sm:gap-6">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 ring-2 ring-border">
                {avatar && <AvatarImage src={avatar} alt={profileName} />}
                <AvatarFallback className="bg-muted text-foreground text-xl sm:text-2xl font-semibold">
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-foreground text-xl sm:text-2xl font-semibold truncate">{profileName}</h3>
                <p className="text-muted-foreground text-sm sm:text-base mt-1 truncate">
                  {bio || t('viewOrModifyPreferences')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Coins className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-foreground text-lg font-semibold">{t('refreshPointsBalance')}</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <span className="text-4xl sm:text-5xl text-foreground font-bold">1,250</span>
                <span className="text-muted-foreground text-lg ml-2">{t('points')}</span>
              </div>
              <Button size="lg" className="w-full sm:w-auto">
                {t('rechargeNow')}
              </Button>
            </div>
            <p className="text-muted-foreground text-sm mt-4">{t('refreshPointsDescription')}</p>
          </CardContent>
        </Card>

        <Card className="border border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {[
                { icon: Settings, label: t('generalSettings'), onClick: () => onNavigate('general-settings') },
                { icon: Bell, label: t('messageNotifications'), onClick: () => onNavigate('notifications') },
                { icon: Shield, label: t('privacySettings'), onClick: () => onNavigate('privacy') },
                { icon: HelpCircle, label: t('helpAndFeedback'), onClick: () => onNavigate('help-feedback') },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-5 sm:p-6 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={item.onClick}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="p-2.5 rounded-lg bg-muted">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-foreground text-base sm:text-lg font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-5 sm:p-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full h-12 text-base font-semibold"
            >
              <LogOut className="w-5 h-5 mr-2" />
              {t('logout')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
