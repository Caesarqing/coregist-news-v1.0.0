import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '~/shared/ui/button';
import { Input } from '~/shared/ui/input';
import { Card, CardContent, CardHeader } from '~/shared/ui/card';
import { Checkbox } from '~/shared/ui/checkbox';
import { Mail, User, Lock, Phone, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { useFirebaseAuth } from '~/contexts/FirebaseAuthContext';
import { Logo } from '~/shared/components/Logo';
import { AuthNavigation } from '~/shared/components/AuthNavigation';

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { registerWithEmail } = useFirebaseAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    fullName: '',
    phone: '',
    agreeTerms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // 邮箱验证
    if (!formData.email) {
      newErrors.email = t('pleaseEnterEmail');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('pleaseEnterValidEmail');
    }

    // 用户名验证（用作显示名称）
    if (!formData.username) {
      newErrors.username = t('pleaseEnterUsername');
    } else if (formData.username.length < 2) {
      newErrors.username = t('usernameMinLength');
    }

    // 密码验证
    if (!formData.password) {
      newErrors.password = t('pleaseEnterPassword');
    } else if (formData.password.length < 6) {
      newErrors.password = t('passwordMinLength');
    }

    // 手机号验证（可选）
    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = t('pleaseEnterValidPhone');
    }

    // 同意条款验证
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = t('pleaseAgreeToTerms');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    try {
      // 使用 Firebase 注册
      const displayName = formData.fullName || formData.username;
      await registerWithEmail(formData.email, formData.password, displayName);
      
      // 注册成功，显示验证邮件提示
      setRegistrationSuccess(true);
      
      // 3秒后跳转到登录页
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('注册失败:', error);
      const errorMessage = error?.message || t('registerFailed');
      
      // 根据错误类型设置错误消息
      if (errorMessage.includes('邮箱已被注册') || errorMessage.includes('email-already-in-use')) {
        setErrors({ email: t('emailAlreadyRegistered') });
      } else if (errorMessage.includes('邮箱格式') || errorMessage.includes('invalid-email')) {
        setErrors({ email: t('pleaseEnterValidEmail') });
      } else if (errorMessage.includes('密码') || errorMessage.includes('weak-password')) {
        setErrors({ password: t('passwordMinLength') });
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <>
      <AuthNavigation />
      <div className="flex items-center justify-center p-4 sm:p-6 min-h-screen pt-24 sm:pt-32">
        <Card className="w-full max-w-md border-border/50 backdrop-blur-xl">
          <CardHeader className="text-center space-y-2 pb-4 sm:pb-5 px-6 sm:px-8 pt-5 sm:pt-6">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">{t('createAccount')}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">{t('joinAINewsAssistant')}</p>
          </CardHeader>
          <CardContent className="pb-6 sm:pb-8 px-4 sm:px-6 lg:px-8 pt-0">
          {registrationSuccess ? (
            <div className="space-y-4 text-center py-8">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {t('registrationSuccessful')}
              </h2>
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {t('verificationEmailSent')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('checkEmailToVerify')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formData.email}
                </p>
              </div>
              <div className="pt-4">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  {t('goToLogin')}
                </Button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <Input
                  placeholder={t('emailAddress')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`h-11 sm:h-12 text-sm sm:text-base ${errors.email ? 'border-destructive focus:border-destructive' : ''}`}
                />
                {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <Input
                  placeholder={t('username')}
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`h-11 sm:h-12 text-sm sm:text-base ${errors.username ? 'border-destructive focus:border-destructive' : ''}`}
                />
                {errors.username && (
                  <p className="text-destructive text-xs sm:text-sm mt-1">{errors.username}</p>
                )}
              </div>

              <div>
                <Input
                  placeholder={t('realNameOptional')}
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>

              <div>
                <Input
                  placeholder={t('phoneNumberOptional')}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`h-11 sm:h-12 text-sm sm:text-base ${errors.phone ? 'border-destructive focus:border-destructive' : ''}`}
                />
                {errors.phone && <p className="text-destructive text-xs sm:text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <div className="relative">
                <Input
                  placeholder={t('password')}
                    type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`h-11 sm:h-12 text-sm sm:text-base pr-10 ${errors.password ? 'border-destructive focus:border-destructive' : ''}`}
                />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-destructive text-xs sm:text-sm mt-1">{errors.password}</p>}
              </div>

            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeTerms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) => handleInputChange('agreeTerms', checked as boolean)}
                />
                <label htmlFor="agreeTerms" className="text-sm text-muted-foreground leading-relaxed">
                  {t('iHaveReadAndAgree')}{' '}
                  <Link to="/terms" className="text-primary font-medium hover:underline">{t('userAgreement')}</Link>
                  {' '}{t('and')}{' '}
                  <Link to="/privacy" className="text-primary font-medium hover:underline">{t('privacyPolicy')}</Link>
                </label>
              </div>
              {errors.agreeTerms && <p className="text-destructive text-sm">{errors.agreeTerms}</p>}

              {errors.submit && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">{errors.submit}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 sm:h-12 font-semibold text-sm sm:text-base
                           shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_28px_rgba(37,99,235,0.5)]"
                disabled={isLoading}
              >
                {isLoading ? t('registering') : t('registerNow')}
              </Button>
            </div>
          </form>
          )}

          {!registrationSuccess && (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('alreadyHaveAccount')}</span>{' '}
              <button
                className="text-primary font-semibold hover:underline"
                onClick={() => navigate('/login')}
              >
                {t('loginNow')}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
