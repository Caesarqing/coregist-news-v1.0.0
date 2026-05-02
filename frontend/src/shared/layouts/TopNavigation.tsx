import { useNavigate } from 'react-router-dom';
import { Home, Newspaper, User } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { Logo } from '~/shared/components/Logo';
import { BrandName } from '~/shared/components/BrandName';
import { LanguageSwitcher } from '~/shared/components/LanguageSwitcher';
import { ThemeToggle } from '~/shared/components/ThemeToggle';

interface TopNavigationProps {
  activeTab: string;
}

export function TopNavigation({ activeTab }: TopNavigationProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tabs = [
    { id: 'home', label: t('aiProductCenter'), icon: Home, path: '/home' },
    { id: 'news', label: t('newsCenter'), icon: Newspaper, path: '/news' },
    { id: 'profile', label: t('personalCenter'), icon: User, path: '/profile' },
  ];

  const handleTabChange = (path: string) => {
    navigate(path);
  };

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-b from-background/95 via-background/85 to-background/40 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="relative grid h-12 sm:h-14 grid-cols-[auto_1fr_auto] items-center rounded-full border border-border/60 bg-card/80 shadow-[0_18px_45px_rgba(15,23,42,0.3)] backdrop-blur-2xl px-2 sm:px-3">
          {/* Logo 区域 */}
          <div className="flex min-w-0 items-center justify-self-start">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => navigate('/home')}
            >
              <Logo className="text-foreground" size={32} />
              <BrandName size="md" className="hidden sm:inline" />
            </div>
          </div>

          {/* 导航区域 */}
          <div className="absolute left-1/2 top-1/2 flex min-w-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center px-1 sm:static sm:col-start-2 sm:translate-x-0 sm:translate-y-0 sm:px-4">
            <nav className="flex items-center justify-center gap-2 sm:gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.path)}
                    className={`
                      relative inline-flex h-10 w-10 sm:h-auto sm:w-auto items-center justify-center gap-2 sm:px-4 lg:px-5 sm:py-1.5
                      text-xs sm:text-sm font-medium rounded-full cursor-pointer
                      transition-colors duration-200
                      ${isActive
                        ? [
                            'bg-primary/12 text-primary',
                            'shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_2px_12px_rgba(37,99,235,0.15)]',
                          ].join(' ')
                        : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/40'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 右侧语言切换器 */}
          <div className="flex items-center gap-1.5 sm:gap-2 justify-self-end">
            <ThemeToggle />
            <LanguageSwitcher showLabel={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
