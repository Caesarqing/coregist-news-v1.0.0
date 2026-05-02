import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '~/shared/ui/button';
import { Logo } from '~/shared/components/Logo';
import { BrandName } from '~/shared/components/BrandName';
import { LanguageSwitcher } from '~/shared/components/LanguageSwitcher';
import { ThemeToggle } from '~/shared/components/ThemeToggle';
import { useLanguage } from '~/contexts/LanguageContext';

export function AuthNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const handleLogoClick = () => {
    if (location.pathname !== '/') {
      navigate('/');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background/95 via-background/85 to-background/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex h-12 sm:h-14 items-center justify-between rounded-full border border-border/60 bg-card/80 shadow-[0_18px_45px_rgba(15,23,42,0.3)] backdrop-blur-2xl px-2 sm:px-3">
            {/* Logo 区域 */}
            <div
              className="flex min-w-0 items-center gap-2.5 cursor-pointer"
              onClick={handleLogoClick}
            >
              <Logo className="text-foreground" size={32} />
              <BrandName size="md" className="hidden sm:inline" />
            </div>

            {/* 右侧操作区域 */}
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />

              {/* 语言选择器 */}
              <div className="hidden sm:block">
                <LanguageSwitcher showLabel={false} />
              </div>

              {/* 登陆/注册按键 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  {language === 'zh-CN' ? '登录' : 'Login'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/register')}
                >
                  {language === 'zh-CN' ? '注册' : 'Register'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 顶部空间占位符 */}
      <div className="h-20" />
    </>
  );
}
