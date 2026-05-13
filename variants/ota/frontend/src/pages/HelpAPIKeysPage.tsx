import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const PROVIDERS = [
  {
    key: 'gemini',
    consoleUrl: 'https://aistudio.google.com',
    pricingUrl: 'https://ai.google.dev/pricing',
  },
  {
    key: 'openai',
    consoleUrl: 'https://platform.openai.com',
    pricingUrl: 'https://openai.com/api/pricing',
  },
  {
    key: 'anthropic',
    consoleUrl: 'https://console.anthropic.com',
    pricingUrl: 'https://www.anthropic.com/pricing',
  },
] as const;

const NOTES = ['localStorage', 'byok', 'pricing'] as const;

export function HelpAPIKeysPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </Link>

        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t('help.apiKeys.title')}</h1>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold">{t('help.apiKeys.intro.heading')}</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>{t('help.apiKeys.intro.point1')}</li>
              <li>{t('help.apiKeys.intro.point2')}</li>
              <li>{t('help.apiKeys.intro.point3')}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('help.apiKeys.providers.heading')}</h2>
            <div className="space-y-5">
              {PROVIDERS.map((p) => (
                <div key={p.key} className="space-y-2 border-l-2 border-border pl-4">
                  <h3 className="text-sm font-medium text-foreground">
                    {t(`help.apiKeys.providers.${p.key}.name`)}
                  </h3>
                  <div className="text-xs space-y-1.5">
                    <a
                      href={p.consoleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {t(`help.apiKeys.providers.${p.key}.urlLabel`)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-muted-foreground leading-relaxed">
                      {t(`help.apiKeys.providers.${p.key}.steps`)}
                    </p>
                    <a
                      href={p.pricingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {t('help.apiKeys.providers.pricingLink')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold">{t('help.apiKeys.alternative.heading')}</h2>
            <p className="text-sm text-muted-foreground">{t('help.apiKeys.alternative.body')}</p>
            <Link
              to="/help/local-llm"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t('help.apiKeys.alternative.link')}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold">{t('help.apiKeys.notes.heading')}</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              {NOTES.map((n) => (
                <li key={n}>{t(`help.apiKeys.notes.${n}`)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
