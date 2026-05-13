import { useTranslation } from 'react-i18next';

export function AppFooter() {
  const { t, i18n } = useTranslation();
  const baseUrl = 'https://fablab-westharima.jp';
  const isJa = i18n.language === 'ja';
  const langPrefix = i18n.language === 'en' ? '/en' : '';

  const linkClass = 'hover:text-foreground hover:underline transition-colors';

  return (
    <footer className="border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-between">
        <span>{t('footer.copyright')}</span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a
            href={`${baseUrl}${langPrefix}/terms`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {t('footer.terms')}
          </a>
          <a
            href={`${baseUrl}${langPrefix}/privacy`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {t('footer.privacy')}
          </a>
          {isJa && (
            <a
              href={`${baseUrl}/tokutei`}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {t('footer.tokutei')}
            </a>
          )}
          <a
            href={`${baseUrl}${langPrefix}/refund`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {t('footer.refund')}
          </a>
        </nav>
      </div>
    </footer>
  );
}
