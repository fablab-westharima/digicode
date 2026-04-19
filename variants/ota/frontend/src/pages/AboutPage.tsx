import { useTranslation } from 'react-i18next';
import AboutPageJa from './about/AboutPageJa';
import AboutPageEn from './about/AboutPageEn';
import AboutPageEs from './about/AboutPageEs';
import AboutPagePt from './about/AboutPagePt';
import AboutPageZh from './about/AboutPageZh';

export function AboutPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  if (lang === 'en' || lang?.startsWith('en-')) return <AboutPageEn />;
  if (lang === 'es' || lang?.startsWith('es-')) return <AboutPageEs />;
  if (lang === 'pt-PT' || lang?.startsWith('pt')) return <AboutPagePt />;
  if (lang === 'zh-TW' || lang?.startsWith('zh')) return <AboutPageZh />;
  return <AboutPageJa />;
}
