import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Input } from '~/shared/ui/input';
import { Label } from '~/shared/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '~/shared/ui/avatar';
import { ArrowLeft, Camera, User, Mail, Calendar, Save } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { authApi } from '~/api/apiClient';
import { PageHero } from '~/shared/components/PageHero';

export function EditProfilePage() {
  const navigate = useNavigate();
  const onBack = () => navigate('/profile');
  const { language, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const heroDescription =
    language === 'zh-CN'
      ? '更新个人资料与联系方式，保持账户信息准确'
       : 'Update your profile and contact details to keep account information accurate';

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        setIsLoading(true);
        const user = await authApi.getCurrentUser();
        setUsername(user.username || user.name || '');
        setBio(user.bio || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setBirthday(user.birthday || '');
        setAvatar(user.avatar || user.avatar_url || '');
      } catch (error) {
        console.error('Load user info failed:', error);
        setError(t('loadUserInfoFailed') || '加载用户信息失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserInfo();
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setError(t('invalidImageFile') || '请选择有效的图片文件');
        return;
      }
      
      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(t('fileTooLarge') || '文件大小不能超过5MB');
        return;
      }

      setAvatarFile(file);
      setError('');
      
      // 显示预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setError('');
      setIsSaving(true);

      const updateData: any = {
        name: username,
        bio,
        phone,
        birthday,
      };

      if (avatarFile && avatar) {
        updateData.avatar = avatar;
      }

      await authApi.updateProfile(updateData);

      onBack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存失败，请重试';
      setError(errorMessage);
      console.error('Save profile failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('editProfile')}
        description={heroDescription}
        icon={User}
      />

      {isLoading ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card className="border border-border">
            <CardContent className="p-8 text-center text-muted-foreground">{t('loading')}</CardContent>
          </Card>
        </div>
      ) : (
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
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-24 h-24 sm:w-28 sm:h-28 ring-2 ring-border">
                    {avatar && <AvatarImage src={avatar} alt={username} />}
                    <AvatarFallback className="bg-muted text-foreground text-3xl font-semibold">
                      {username ? username.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute -bottom-1 -right-1 rounded-full w-9 h-9"
                    onClick={handleAvatarClick}
                    title={t('changeAvatar') || '更换头像'}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    aria-label={t('uploadAvatar') || '上传头像'}
                  />
                </div>
                <p className="text-muted-foreground text-sm text-center">{t('clickCameraIconToChange')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2 px-6 pt-6">
              <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                {t('basicInformation')}
              </h3>
            </CardHeader>
            <CardContent className="pt-2 px-6 pb-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-medium text-sm">{t('username')}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 text-base"
                  placeholder={t('enterUsername')}
                />
                <p className="text-muted-foreground text-xs">{t('usernameCanBeChanged')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground font-medium text-sm">{t('personalBio')}</Label>
                <Input
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="h-11 text-base"
                  placeholder={t('introduceYourself')}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2 px-6 pt-6">
              <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                {t('contactInformation')}
              </h3>
            </CardHeader>
            <CardContent className="pt-2 px-6 pb-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium text-sm">{t('emailAddress')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="h-11 text-base bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-muted-foreground text-xs">{t('emailCannotBeChanged')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground font-medium text-sm">{t('phoneNumber')}</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2 px-6 pt-6">
              <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                {t('personalDetails')}
              </h3>
            </CardHeader>
            <CardContent className="pt-2 px-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-foreground font-medium text-sm">{t('birthday')}</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex-1 h-11 text-base font-medium"
                >
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="flex-1 h-11 text-base font-medium"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? t('saving') : t('saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
