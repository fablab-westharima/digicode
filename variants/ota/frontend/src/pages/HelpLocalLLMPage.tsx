import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function HelpLocalLLMPage() {
  const { t } = useTranslation();

  const tools = [
    { name: 'Ollama', url: 'https://ollama.com', descKey: 'help.localLlm.tools.ollama' },
    { name: 'LM Studio', url: 'https://lmstudio.ai', descKey: 'help.localLlm.tools.lmStudio' },
  ];

  const specRows = [
    { tierKey: 'help.localLlm.spec.entry.tier',     ramKey: 'help.localLlm.spec.entry.ram',     modelsKey: 'help.localLlm.spec.entry.models' },
    { tierKey: 'help.localLlm.spec.middle.tier',    ramKey: 'help.localLlm.spec.middle.ram',    modelsKey: 'help.localLlm.spec.middle.models' },
    { tierKey: 'help.localLlm.spec.highGpu.tier',   ramKey: 'help.localLlm.spec.highGpu.ram',   modelsKey: 'help.localLlm.spec.highGpu.models' },
    { tierKey: 'help.localLlm.spec.appleSi.tier',   ramKey: 'help.localLlm.spec.appleSi.ram',   modelsKey: 'help.localLlm.spec.appleSi.models' },
    { tierKey: 'help.localLlm.spec.ultra.tier',     ramKey: 'help.localLlm.spec.ultra.ram',     modelsKey: 'help.localLlm.spec.ultra.models' },
  ];

  const notes = ['env', 'quality', 'oldPc', 'fallback'] as const;

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

        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t('help.localLlm.title')}</h1>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold">{t('help.localLlm.intro.heading')}</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>{t('help.localLlm.intro.point1')}</li>
              <li>{t('help.localLlm.intro.point2')}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold">{t('help.localLlm.tools.heading')}</h2>
            <ul className="space-y-2 text-sm">
              {tools.map((tool) => (
                <li key={tool.name} className="flex items-start gap-2">
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    {tool.name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-muted-foreground">— {t(tool.descKey)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold">{t('help.localLlm.spec.heading')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium">{t('help.localLlm.spec.col.tier')}</th>
                    <th className="text-left py-2 px-2 font-medium">{t('help.localLlm.spec.col.ram')}</th>
                    <th className="text-left py-2 px-2 font-medium">{t('help.localLlm.spec.col.models')}</th>
                  </tr>
                </thead>
                <tbody>
                  {specRows.map((row) => (
                    <tr key={row.tierKey} className="border-b border-border/50 align-top">
                      <td className="py-2 px-2 whitespace-nowrap">{t(row.tierKey)}</td>
                      <td className="py-2 px-2 whitespace-nowrap text-muted-foreground">{t(row.ramKey)}</td>
                      <td className="py-2 px-2 text-muted-foreground">{t(row.modelsKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold">{t('help.localLlm.notes.heading')}</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              {notes.map((n) => (
                <li key={n}>{t(`help.localLlm.notes.${n}`)}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground pt-2">
              {t('help.localLlm.notes.disclaimer')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
