import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '~/shared/ui/select';
import { userSettingsApi } from '~/api/apiClient';
import { useLanguage } from '~/contexts/LanguageContext';

export const SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
] as const;

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['value'];

interface LanguageSwitcherProps {
  showLabel?: boolean;
  hideCode?: boolean;
  align?: 'start' | 'center' | 'end';
  buttonClassName?: string;
}

export function LanguageSwitcher({
  align = 'end',
  buttonClassName = '',
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const current = SUPPORTED_LANGUAGES.find((option) => option.value === language) || SUPPORTED_LANGUAGES[0];

  const handleSelect = (lang: SupportedLanguage) => {
    if (lang === language) return;
    setLanguage(lang);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    void userSettingsApi.updateLanguage(lang).catch((error) => {
      console.warn('Sync language setting failed:', error);
    });
  };

  return (
    <Select
      value={language}
      onValueChange={(value) => {
        handleSelect(value as SupportedLanguage);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Language switcher, current language ${current.label}`}
        title={current.label}
        className={`h-9 w-9 min-w-0 justify-center rounded-full border border-border/70 bg-background/80 px-0 text-foreground hover:bg-muted focus-visible:ring-ring/60 [&>svg:last-child]:hidden ${buttonClassName}`.trim()}
      >
        <Globe className="h-4 w-4" />
        <span className="sr-only">{current.label}</span>
      </SelectTrigger>
      <SelectContent
        align={align}
        className="z-[120] min-w-[10rem] rounded-xl border border-border/80 p-1 shadow-xl"
      >
        {SUPPORTED_LANGUAGES.map((option) => (
          <SelectItem key={option.value} value={option.value} className="rounded-lg px-3 py-2 text-sm">
            <span>{option.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
