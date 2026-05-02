import { Link } from 'react-router-dom';
import { useLanguage } from '~/contexts/LanguageContext';

export function Footer() {
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-muted/30 backdrop-blur-sm overflow-hidden">
      {/* 顶部渐变分隔（替代 border-t） */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px
                   bg-gradient-to-r from-transparent via-border/40 to-transparent"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Footer 内容网格 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* 产品 */}
          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4 tracking-wide uppercase opacity-70">
              {t('products') || '产品'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login?return_url=%2Fhome%2Fnews-push"
                  className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('newsPush') || '新闻推送'}
                </Link>
              </li>
              <li>
                <Link to="/login?return_url=%2Fhome%2Fnews-data"
                  className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('newsDatabase') || '新闻数据库'}
                </Link>
              </li>
              <li>
                <Link to="/login?return_url=%2Fhome%2Ftargeted-tracking"
                  className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('targetedTracking') || '定向跟踪'}
                </Link>
              </li>
            </ul>
          </div>

          {/* 关于 */}
          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4 tracking-wide uppercase opacity-70">
              {t('aboutUs') || '关于我们'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('companyProfile') || '公司简介'}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('news') || '新闻'}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('careers') || '招聘'}</a></li>
            </ul>
          </div>

          {/* 资源 */}
          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4 tracking-wide uppercase opacity-70">
              {t('resources') || '资源'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('documentation') || '文档'}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('support') || '支持'}</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">{t('blog') || '博客'}</a></li>
            </ul>
          </div>

          {/* 法律 */}
          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4 tracking-wide uppercase opacity-70">
              {t('legal') || '法律'}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('privacyPolicy') || '隐私政策'}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('termsOfService') || '服务条款'}
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors duration-150">
                  {t('cookiePolicy') || 'Cookie政策'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部版权 — 用间距和透明度区分，不用横线 */}
        <div className="pt-6 opacity-90">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground/70 text-xs">
              © {currentYear} {t('appName') || 'AI News'}{' '}
              {t('allRightsReserved') || 'All rights reserved.'}
            </p>
            <div className="flex gap-5">
              {(['Twitter', 'GitHub', 'LinkedIn'] as const).map((platform) => (
                <a key={platform} href="#"
                   className="text-muted-foreground/60 hover:text-primary transition-colors duration-150 text-xs">
                  {platform}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
