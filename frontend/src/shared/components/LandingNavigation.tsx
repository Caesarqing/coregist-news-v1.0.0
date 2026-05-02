import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '~/shared/ui/button';
import { Logo } from '~/shared/components/Logo';
import { BrandName } from '~/shared/components/BrandName';
import { useLanguage } from '~/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageSwitcher } from '~/shared/components/LanguageSwitcher';
import { ThemeToggle } from '~/shared/components/ThemeToggle';

export function LandingNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      label: language === 'zh-CN' ? '功能' : 'Features',
      href: '#features',
    },
    {
      label: language === 'zh-CN' ? '新闻' : 'News',
      href: '#news',
    },
    {
      label: language === 'zh-CN' ? '关于' : 'About',
      href: '#about',
    },
    {
      label: language === 'zh-CN' ? '联系' : 'Contact',
      href: '#contact',
    },
  ];

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    if (location.pathname !== '/') {
      navigate('/');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* 导航条 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background/95 via-background/85 to-background/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid h-12 sm:h-14 grid-cols-[auto_1fr_auto] items-center rounded-full border border-border/60 bg-card/80 shadow-[0_18px_45px_rgba(15,23,42,0.3)] backdrop-blur-2xl px-2 sm:px-3">
            {/* Logo 区域 */}
            <div
              className="flex min-w-0 items-center gap-2.5 cursor-pointer"
              onClick={handleLogoClick}
            >
              <Logo className="text-foreground" size={32} />
              <BrandName size="md" className="hidden sm:inline" />
            </div>

            {/* 桌面端导航菜单 */}
            <div className="hidden md:flex items-center justify-center gap-1 px-2">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.href)}
                  className="px-4 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* 右侧操作区域 */}
            <div className="flex items-center gap-2 sm:gap-3 justify-self-end">
              <ThemeToggle />

              {/* 语言选择器 - 桌面端 */}
              <div className="hidden sm:block">
                <LanguageSwitcher showLabel={false} />
              </div>

              {/* 登录/注册按钮 - 桌面端 */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="text-foreground hover:bg-muted/60 px-2 sm:px-3"
                >
                  {language === 'zh-CN' ? '登录' : 'Login'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="shadow-[0_0_0_1px_rgba(37,99,235,0.35)] px-2 sm:px-3"
                >
                  {language === 'zh-CN' ? '注册' : 'Register'}
                </Button>
              </div>

              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-20 z-40 md:hidden"
          >
            <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-4 space-y-3 rounded-2xl border border-border/60 bg-card/95 shadow-[0_24px_60px_rgba(15,23,42,0.5)] backdrop-blur-2xl">
                {/* 移动端导航菜单 */}
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item.href)}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}

                {/* 语言选择 - 移动端 */}
                <div className="flex items-center justify-between px-4 pt-1">
                  <p className="px-4 py-1 text-xs font-semibold text-muted-foreground/80 uppercase">
                    {language === 'zh-CN' ? '语言' : 'Language'}
                  </p>
                  <LanguageSwitcher showLabel={false} align="end" />
                </div>

                {/* 登录/注册按钮 - 移动端 */}
                <div className="space-y-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate('/login');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {language === 'zh-CN' ? '登录' : 'Login'}
                  </Button>
                  <Button
                    className="w-full shadow-[0_0_0_1px_rgba(37,99,235,0.35)]"
                    onClick={() => {
                      navigate('/register');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {language === 'zh-CN' ? '注册' : 'Register'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 顶部空间占位符 */}
      <div className="h-20" />
    </>
  );
}
