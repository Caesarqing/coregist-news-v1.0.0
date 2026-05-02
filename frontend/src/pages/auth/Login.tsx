import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '~/shared/ui/button';
import { Input } from '~/shared/ui/input';
import { Card, CardContent, CardHeader } from '~/shared/ui/card';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { authApi, userSettingsApi, apiClient } from '~/api/apiClient';
import { useLanguage } from '~/contexts/LanguageContext';
import { Logo } from '~/shared/components/Logo';
import { AuthNavigation } from '~/shared/components/AuthNavigation';
import { useFirebaseAuth } from '~/contexts/FirebaseAuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const { signInWithGoogle, signInWithMicrosoft, signInWithFacebook, getIdToken } = useFirebaseAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const returnUrl = searchParams.get('return_url') || '';

  const getSafeReturnUrl = useCallback(() => {
    if (
      returnUrl.startsWith('/') &&
      !returnUrl.startsWith('//') &&
      !returnUrl.includes('://')
    ) {
      return returnUrl;
    }
    return '/home';
  }, [returnUrl]);

  const navigateAfterLogin = useCallback(() => {
    navigate(getSafeReturnUrl(), { replace: true });
  }, [getSafeReturnUrl, navigate]);

  const handleEmailLogin = async () => {
    if (!email || !password) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔐 尝试登录:', { email, password: '***' });
      const result = await authApi.login({ email, password });
      console.log('✅ 登录成功:', result);
      
      // 登录成功后，同步语言设置到后端
      try {
        await userSettingsApi.updateLanguage(language);
        console.log('✅ 语言设置已同步到后端');
      } catch (langError) {
        console.warn('⚠️ 同步语言设置失败，但不影响登录:', langError);
      }
      
      navigateAfterLogin();
    } catch (error: any) {
      console.error('❌ 登录失败:', error);
      // 显示更详细的错误信息
      const errorMessage = error.message || error.error || t('loginFailed');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderLogin = async (provider: 'google' | 'microsoft' | 'facebook') => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log(`🔐 尝试 ${provider} 登录`);
      
      // 根据不同的提供商调用对应的登录方法
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'microsoft') {
        await signInWithMicrosoft();
      } else if (provider === 'facebook') {
        await signInWithFacebook();
      }
      
      console.log(`✅ ${provider} Firebase 登录成功，正在获取后端Token...`);
      
      // 等待一小段时间确保 Firebase 状态更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 获取Firebase ID Token（从FirebaseAuthContext获取）
      const idToken = await getIdToken();
      
      if (!idToken) {
        console.error('❌ 未获取到Firebase Token');
        throw new Error('登录失败：未获取到Firebase Token，请重试');
      }
      
      console.log('✅ 已获取Firebase Token，正在向后端验证...');
      
      // 发送到后端换取后端JWT
      const authResult = await authApi.loginWithGoogle(idToken);
      
      console.log('✅ 后端验证成功，返回数据:', authResult);
      
      // 存储后端JWT
      apiClient.setToken(authResult.access_token || authResult.token);
      if (authResult.refresh_token) {
        apiClient.setRefreshToken(authResult.refresh_token);
      }
      
      console.log(`✅ ${provider} 登录成功，已获取后端Token`);
      
      // 同步语言设置
      try {
        await userSettingsApi.updateLanguage(language);
        console.log('✅ 语言设置已同步');
      } catch (langError) {
        console.warn('⚠️ 同步语言设置失败:', langError);
      }
      
      navigateAfterLogin();
    } catch (error: any) {
      console.error(`❌ ${provider} 登录完整错误:`, error);
      console.error('错误堆栈:', error.stack);
      
      const providerName = provider === 'google' ? 'Google' : provider === 'microsoft' ? 'Microsoft' : 'Facebook';
      
      // 提供更友好的错误信息
      let errorMessage = error.message || `${providerName}登录失败`;
      
      // 特殊错误处理
      if (errorMessage.includes('popup') || errorMessage.includes('弹窗')) {
        errorMessage = '登录窗口被关闭或阻止，请允许浏览器弹窗后重试';
      } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络后重试';
      } else if (errorMessage.includes('Google登录功能未配置')) {
        errorMessage = 'Google登录未配置，请联系管理员';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthNavigation />
      <div className="flex items-center justify-center p-4 sm:p-6 min-h-screen pt-24 sm:pt-32">
        <Card className="w-full max-w-md border-border/50 backdrop-blur-xl">
          <CardHeader className="text-center space-y-2 pb-4 sm:pb-5 px-6 sm:px-8 pt-5 sm:pt-6">
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">{t('aiNewsAssistant')}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">{t('smartRecommendation')}</p>
          </CardHeader>
          <CardContent className="pb-6 sm:pb-8 px-4 sm:px-6 lg:px-8 pt-0">
          <div className="space-y-5">
            <div className="space-y-4">
              <Input
                placeholder={t('emailAddress')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 sm:h-12 text-sm sm:text-base"
              />
              <div className="relative">
                <Input
                  placeholder={t('password')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 sm:h-12 text-sm sm:text-base pr-10"
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
              <Button
                onClick={handleEmailLogin}
                className="w-full h-11 sm:h-12 font-semibold text-sm sm:text-base
                           shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_28px_rgba(37,99,235,0.5)]"
                disabled={!email || !password || isLoading}
              >
                <LogIn className="w-4 h-4 mr-2" /> {isLoading ? t('loggingIn') : t('emailLogin')}
              </Button>
            </div>

            {error && (
              <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                {language === 'zh-CN' ? '忘记密码？'  : 'Forgot Password?'}
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {/* 渐变淡出线（代替贯穿横线） */}
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/40" />
              <span className="text-xs text-muted-foreground/60 whitespace-nowrap px-1 font-medium">
                {t('orUseFollowing')}
              </span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/40" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                className="h-10 sm:h-11 text-xs sm:text-sm flex items-center justify-center px-3" 
                onClick={() => handleProviderLogin('google')}
                disabled={isLoading}
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2 flex-shrink-0" /> 
                <span>Google</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-10 sm:h-11 text-xs sm:text-sm flex items-center justify-center px-3" 
                onClick={() => handleProviderLogin('microsoft')}
                disabled={isLoading}
              >
                <img src="https://www.microsoft.com/favicon.ico" alt="Microsoft" className="w-4 h-4 mr-2 flex-shrink-0" /> 
                <span>Microsoft</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-10 sm:h-11 text-xs sm:text-sm flex items-center justify-center px-3" 
                onClick={() => handleProviderLogin('facebook')}
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {t('agreeTerms')}{' '}
              <Link to="/terms" className="text-primary font-medium hover:underline">{t('userAgreement')}</Link>
              {' '}{t('and')}{' '}
              <Link to="/privacy" className="text-primary font-medium hover:underline">{t('privacyPolicy')}</Link>
            </p>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('noAccount')}</span>{' '}
            <button
              className="text-primary font-semibold hover:underline"
              onClick={() => navigate(returnUrl ? `/register?return_url=${encodeURIComponent(returnUrl)}` : '/register')}
            >
              {t('registerNow')}
            </button>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
