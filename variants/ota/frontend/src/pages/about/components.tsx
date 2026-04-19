import { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AboutLabels {
  freeLabel: string;
  proLabel: string;
}

const AboutLabelsContext = createContext<AboutLabels>({
  freeLabel: '無料',
  proLabel: 'PRO',
});

interface AboutShellProps {
  backLabel: string;
  labels: AboutLabels;
  children: React.ReactNode;
}

export function AboutShell({ backLabel, labels, children }: AboutShellProps) {
  return (
    <AboutLabelsContext.Provider value={labels}>
      <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
        <header className="sticky top-0 z-10 bg-[#161B22] border-b border-[#30363D]">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-[#8B949E] hover:text-[#E6EDF3]">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {backLabel}
              </Button>
            </Link>
            <a
              href="https://github.com/fablab-westharima/DigiCode-Finder/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#58A6FF] hover:underline flex items-center gap-1"
            >
              DigiCode Finder
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12">{children}</main>
      </div>
    </AboutLabelsContext.Provider>
  );
}

export function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-5">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[#8B949E] leading-relaxed">{description}</p>
    </div>
  );
}

interface UniqueFeatureProps {
  title: string;
  description: string;
  tag: string;
  pricing?: 'free' | 'pro';
}

export function UniqueFeature({ title, description, tag, pricing = 'free' }: UniqueFeatureProps) {
  const { freeLabel, proLabel } = useContext(AboutLabelsContext);
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs px-2 py-1 rounded-full bg-[#1F6FEB]/20 text-[#58A6FF] font-medium">
          {tag}
        </span>
        {pricing === 'free' ? (
          <span className="text-xs px-2 py-1 rounded-full bg-[#238636]/20 text-[#3FB950] font-medium">
            {freeLabel}
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-[#DA3633]/20 text-[#F85149] font-medium">
            {proLabel}
          </span>
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-[#8B949E] leading-relaxed">{description}</p>
    </div>
  );
}

interface PlanRowProps {
  feature: string;
  guest: boolean;
  free: boolean;
  pro: boolean;
  note?: string;
}

export function PlanRow({ feature, guest, free, pro, note }: PlanRowProps) {
  const check = <span className="text-[#3FB950]">&#10003;</span>;
  const dash = <span className="text-[#484F58]">&#8212;</span>;
  return (
    <tr className="border-b border-[#21262D]">
      <td className="py-2.5 pr-4">
        {feature}
        {note && <span className="block text-xs text-[#8B949E]">{note}</span>}
      </td>
      <td className="text-center py-2.5 px-4">{guest ? check : dash}</td>
      <td className="text-center py-2.5 px-4">{free ? check : dash}</td>
      <td className="text-center py-2.5 px-4">{pro ? check : dash}</td>
    </tr>
  );
}

export function BoardCategory({ title, boards }: { title: string; boards: string[] }) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-5">
      <h3 className="text-base font-semibold mb-3">{title}</h3>
      <ul className="space-y-1">
        {boards.map((board) => (
          <li key={board} className="text-sm text-[#8B949E]">
            {board}
          </li>
        ))}
      </ul>
    </div>
  );
}
