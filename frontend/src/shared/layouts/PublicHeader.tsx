import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '~/contexts/LanguageContext';
import { Button } from '~/shared/ui/button';
import { Logo } from '~/shared/components/Logo';
import { BrandName } from '~/shared/components/BrandName';
import { LanguageSwitcher } from '~/shared/components/LanguageSwitcher';
import { ThemeToggle } from '~/shared/components/ThemeToggle';

export function PublicHeader() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <Logo className="text-foreground" size={40} />
          <BrandName size="md" />
        </Link>

        {/* Right side: Theme, Language & Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <LanguageSwitcher showLabel={false} />

          {/* Login/Register or User Menu */}
          {token ? (
            <Button
              variant="outline"
              size="sm"
              className="px-3"
              onClick={() => navigate('/profile')}
            >
              {t('profile') || 'Profile'}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                {t('loginNow') || 'Login'}
              </Button>
              <Button
                size="sm"
                className="px-3"
                onClick={() => navigate('/register')}
              >
                {t('registerNow') || 'Register'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
