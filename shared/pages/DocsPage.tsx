import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Wrench, Lightbulb, Blocks, HelpCircle, Cpu, Server, Wifi } from 'lucide-react';
import { LocaleSelector } from '@/components/common/LocaleSelector';

interface DocItem {
  id: string;
  file: string;
  icon: React.ReactNode;
}

const docItems: DocItem[] = [
  {
    id: 'getting-started',
    file: 'getting-started.md',
    icon: <BookOpen className="w-5 h-5" />
  },
  {
    id: 'recommended-hardware',
    file: 'recommended-hardware.md',
    icon: <Cpu className="w-5 h-5" />
  },
  {
    id: 'hardware-setup',
    file: 'hardware-setup.md',
    icon: <Wrench className="w-5 h-5" />
  },
  {
    id: 'program-setup-common',
    file: '01-program-setup-common.md',
    icon: <Wrench className="w-5 h-5" />
  },
  {
    id: 'program-setup-rp2040',
    file: '02-program-setup-rp2040.md',
    icon: <Cpu className="w-5 h-5" />
  },
  {
    id: 'program-setup-arduino',
    file: '03-program-setup-arduino.md',
    icon: <Cpu className="w-5 h-5" />
  },
  {
    id: 'program-setup-esp32',
    file: '04-program-setup-esp32.md',
    icon: <Cpu className="w-5 h-5" />
  },
  {
    id: 'ota-guide',
    file: '05-ota-guide.md',
    icon: <Wifi className="w-5 h-5" />
  },
  {
    id: 'block-reference',
    file: 'block-reference.md',
    icon: <Blocks className="w-5 h-5" />
  },
  {
    id: 'troubleshooting',
    file: 'troubleshooting.md',
    icon: <Lightbulb className="w-5 h-5" />
  },
  {
    id: 'faq',
    file: 'faq.md',
    icon: <HelpCircle className="w-5 h-5" />
  },
  {
    id: 'local-compile-server',
    file: 'local-compile-server.md',
    icon: <Server className="w-5 h-5" />
  }
];

export function DocsPage() {
  const { t } = useTranslation();
  const [selectedDoc, setSelectedDoc] = useState<DocItem>(docItems[0]);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadDoc = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/docs/${selectedDoc.file}`);
        if (!response.ok) throw new Error('Failed to load document');
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error('Error loading document:', error);
        setContent(`# ${t('common.error')}\n\n${t('docs.loadError')}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadDoc();
  }, [selectedDoc, t]);

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* ヘッダー */}
      <header className="bg-[#161B22]/80 backdrop-blur-sm border-b border-[#2E333D] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-teal-400" />
            <h1 className="text-xl font-bold text-[#E6EDF3]">{t('home.docs')}</h1>
          </div>
          <LocaleSelector />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* サイドバーナビゲーション */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              {docItems.map((doc) => (
                <Card
                  key={doc.id}
                  className={`cursor-pointer transition-all duration-200 bg-[#161B22] border-[#2E333D] ${
                    selectedDoc.id === doc.id
                      ? 'border-teal-500 bg-teal-900/20 shadow-md'
                      : 'hover:border-teal-600 hover:bg-teal-900/10'
                  }`}
                  onClick={() => setSelectedDoc(doc)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${selectedDoc.id === doc.id ? 'text-teal-400' : 'text-[#8B949E]'}`}>
                        {doc.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-sm mb-1 ${
                          selectedDoc.id === doc.id ? 'text-teal-300' : 'text-[#E6EDF3]'
                        }`}>
                          {t(`docs.${doc.id}.title`)}
                        </h3>
                        <p className="text-xs text-[#8B949E] line-clamp-2">
                          {t(`docs.${doc.id}.description`)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </aside>

          {/* メインコンテンツ */}
          <main className="lg:col-span-3">
            <Card className="shadow-lg bg-[#161B22] border-[#2E333D]">
              <CardContent className="p-8">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
                  </div>
                ) : (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
