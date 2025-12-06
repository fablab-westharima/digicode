import { useTranslation } from 'react-i18next';
import { Code2, Cpu } from 'lucide-react';
import { useLanguageStore, type CodeLanguage } from '@/stores/languageStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSelector() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();

  const handleLanguageChange = (newLanguage: CodeLanguage) => {
    if (newLanguage !== language) {
      // 言語変更の確認（ワークスペースがリセットされることを通知）
      const confirmed = confirm(
        t('editor.confirmLanguageChange', {
          defaultValue: '言語を変更するとワークスペースがリセットされます。よろしいですか？'
        })
      );
      if (confirmed) {
        setLanguage(newLanguage);
      }
    }
  };

  return (
    <Select value={language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="h-8 w-[140px] bg-[#2E333D] border-[#2E333D] text-[#E6EDF3] hover:bg-[#3E434D] text-xs">
        <SelectValue>
          <div className="flex items-center gap-2">
            {language === 'arduino' ? (
              <>
                <Cpu className="w-3 h-3" />
                <span>Arduino C++</span>
              </>
            ) : (
              <>
                <Code2 className="w-3 h-3" />
                <span>MicroPython</span>
              </>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="arduino">
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3" />
            <span>Arduino C++</span>
          </div>
        </SelectItem>
        <SelectItem value="micropython">
          <div className="flex items-center gap-2">
            <Code2 className="w-3 h-3" />
            <span>MicroPython</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
