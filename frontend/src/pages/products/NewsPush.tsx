import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Input } from '~/shared/ui/input';
import { Checkbox } from '~/shared/ui/checkbox';
import { Zap, Clock, TrendingUp, X, Calendar, Grid, List, Hash, CheckCircle2, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { userSettingsApi } from '~/api/apiClient';
import type { PushSettings, PushSettingsEntry } from '~/types/api';
import { motion } from 'framer-motion';
import { PageHero } from '~/shared/components/PageHero';

interface PushKeyword {
  id: string;
  keyword: string;
  createdAt: string;
}

interface PushEntry {
  id: string;
  keywords: string[];
  pushDays: string[];
  pushTimes: string[];
  pushCount: number;
  everyday: boolean;
  createdAt: string;
}

const defaultPushSettings: PushSettings = {
  pushDays: ['monday', 'wednesday', 'friday'],
  pushTimes: ['08:00', '18:00'],
  pushCount: 5,
  everyday: false,
  keywords: [],
};
const LOCAL_PUSH_SETTINGS_KEY = 'news_push_settings_cache';

export function NewsPushPage() {
  const navigate = useNavigate();
  const { id: selectedEntryId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const heroTitle = language === 'zh-CN' ? '新闻推送'  : 'News Push';
  const heroDescription =
    language === 'zh-CN'
      ? '定制您的个性化新闻推送，永不错过感兴趣的内容'
       : 'Customize your personalized news push and never miss content you care about';
  const [keywords, setKeywords] = useState<PushKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [pushSettings, setPushSettings] = useState<PushSettings>(defaultPushSettings);
  const [newTimeInput, setNewTimeInput] = useState('');
  const [customCount, setCustomCount] = useState('5');
  const [pushEntries, setPushEntries] = useState<PushEntry[]>([]);
  const [activeSection, setActiveSection] = useState<'settings' | 'my-news'>('settings');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [keywordError, setKeywordError] = useState('');

  const loadLocalCachedEntries = (): PushSettingsEntry[] | null => {
    try {
      const raw = localStorage.getItem(LOCAL_PUSH_SETTINGS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed) return null;
      if (Array.isArray(parsed.pushSettingsList)) return parsed.pushSettingsList as PushSettingsEntry[];
      if (parsed.pushSettings) return [parsed.pushSettings as PushSettingsEntry];
      return null;
    } catch {
      return null;
    }
  };

  const saveLocalCachedEntries = (entries: PushSettingsEntry[]) => {
    try {
      localStorage.setItem(
        LOCAL_PUSH_SETTINGS_KEY,
        JSON.stringify({
          pushSettingsList: entries,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore local cache errors
    }
  };

  const resetSettingsForm = () => {
    setPushSettings(defaultPushSettings);
    setKeywords([]);
    setNewKeyword('');
    setNewTimeInput('');
    setCustomCount(defaultPushSettings.pushCount.toString());
    setKeywordError('');
  };

  useEffect(() => {
    if (selectedEntryId || searchParams.get('tab') === 'my-news') {
      setActiveSection('my-news');
    }
  }, [selectedEntryId, searchParams]);

  const weekDays = [
    { value: 'monday', label: t('monday') },
    { value: 'tuesday', label: t('tuesday') },
    { value: 'wednesday', label: t('wednesday') },
    { value: 'thursday', label: t('thursday') },
    { value: 'friday', label: t('friday') },
    { value: 'saturday', label: t('saturday') },
    { value: 'sunday', label: t('sunday') },
    { value: 'everyday', label: t('everyday') },
  ];

  const buildEntryFromSettings = (settings: PushSettings, keywordList: string[], id?: string, createdAt?: string): PushEntry | null => {
    if (!keywordList || keywordList.length === 0) return null;
    return {
      id: id || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      keywords: keywordList,
      pushDays: settings.pushDays,
      pushTimes: settings.pushTimes,
      pushCount: settings.pushCount,
      everyday: settings.everyday,
      createdAt: createdAt
        ? new Date(createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    };
  };

  const mapPushSettingsEntry = (entry: PushSettingsEntry, index: number): PushEntry | null => {
    return buildEntryFromSettings(
      entry,
      entry.keywords || [],
      entry.id || `entry-${index}`,
      entry.createdAt
    );
  };

  const serializePushEntry = (entry: PushEntry): PushSettingsEntry => ({
    id: entry.id.startsWith('local-') ? undefined : entry.id,
    pushDays: entry.pushDays,
    pushTimes: entry.pushTimes,
    pushCount: entry.pushCount,
    everyday: entry.everyday,
    keywords: entry.keywords,
    createdAt: entry.createdAt,
  });

  // 从 API 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const result = await userSettingsApi.getSettings();
        const savedEntries = (result.pushSettingsList || [])
          .map(mapPushSettingsEntry)
          .filter(Boolean) as PushEntry[];
        if (savedEntries.length > 0) {
          setPushEntries(savedEntries);
          saveLocalCachedEntries(savedEntries.map(serializePushEntry));
        } else if (result.pushSettings) {
          const keywordList = result.pushSettings.keywords || [];
          const entry = buildEntryFromSettings(result.pushSettings, keywordList, 'legacy');
          setPushEntries(entry ? [entry] : []);
        }
      } catch {
        // 未登录或加载失败，尝试回退本地缓存
        const cachedEntries = loadLocalCachedEntries();
        if (cachedEntries) {
          const entries = cachedEntries
            .map(mapPushSettingsEntry)
            .filter(Boolean) as PushEntry[];
          setPushEntries(entries);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // 推送入口由当前设置生成，无需模拟历史记录

  const handleAddKeyword = () => {
    const toAdd = newKeyword.trim().split(/[;；,，]+/).map((k) => k.trim()).filter(Boolean);
    if (toAdd.length === 0) return;

    const availableCount = 3 - keywords.length;
    if (availableCount <= 0) {
      setKeywordError(language === 'zh-CN' ? '最多添加 3 个关键词' : 'You can add up to 3 keywords');
      return;
    }

    const toInsert = toAdd.slice(0, availableCount);
    const newItems: PushKeyword[] = toInsert.map((kw) => ({
        id: `kw-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        keyword: kw,
        createdAt: new Date().toISOString().split('T')[0],
    }));

    setKeywords((prev) => [...prev, ...newItems]);
    setNewKeyword('');
    setKeywordError(
      toAdd.length > availableCount
        ? language === 'zh-CN'
          ? '最多添加 3 个关键词，超出部分已忽略'
          : 'Only 3 keywords are allowed. Extra keywords were ignored.'
        : ''
    );
  };

  const handleRemoveKeyword = (id: string) => {
    setKeywords((k) => k.filter((item) => item.id !== id));
    if (keywords.length <= 3) setKeywordError('');
  };

  const validateAndFormatTime = (value: string): string => {
    const timeMatch = value.match(/^(\d{1,2})/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      if (hour >= 0 && hour <= 23) {
        return hour.toString().padStart(2, '0') + ':00';
      }
    }
    return '';
  };

  const addTime = () => {
    const formattedTime = validateAndFormatTime(newTimeInput);
    if (formattedTime && !pushSettings.pushTimes.includes(formattedTime)) {
      setPushSettings((prev) => ({
        ...prev,
        pushTimes: [...prev.pushTimes, formattedTime],
      }));
      setNewTimeInput('');
    }
  };

  const removeTime = (time: string) => {
    setPushSettings((prev) => ({
      ...prev,
      pushTimes: prev.pushTimes.filter((t) => t !== time),
    }));
  };

  const handleDayToggle = (day: string) => {
    if (day === 'everyday') {
      setPushSettings((prev) => ({
        ...prev,
        everyday: !prev.everyday,
        pushDays: !prev.everyday ? weekDays.slice(0, -1).map((d) => d.value) : [],
      }));
    } else {
      setPushSettings((prev) => ({
        ...prev,
        pushDays: prev.pushDays.includes(day)
          ? prev.pushDays.filter((d) => d !== day)
          : [...prev.pushDays, day],
        everyday: false,
      }));
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCount(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1) {
      const finalValue = numValue >= 20 ? 20 : numValue;
      setPushSettings((prev) => ({ ...prev, pushCount: finalValue }));
      if (numValue >= 20) setCustomCount('20');
    }
  };

  const handleSaveSettings = async () => {
    const keywordStrings = keywords.map((k) => k.keyword);
    const completeSettings: PushSettings = {
      ...pushSettings,
      keywords: keywordStrings,
    };

    try {
      setIsSaving(true);
      const nextSettingsList = [
        ...pushEntries.map(serializePushEntry),
        completeSettings,
      ];
      const result = await userSettingsApi.updatePushSettingsList(nextSettingsList);
      const savedSettingsList = result?.pushSettingsList || nextSettingsList;
      const savedEntries = savedSettingsList
        .map(mapPushSettingsEntry)
        .filter(Boolean) as PushEntry[];

      saveLocalCachedEntries(savedSettingsList);
      setPushEntries(savedEntries);
      resetSettingsForm();
      setActiveSection('my-news');
      navigate('/home/news-push?tab=my-news');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      const isUnauthorized = msg.includes('unauthorized') || msg.includes('401');
      if (isUnauthorized) {
        localStorage.removeItem('access_token');
        alert(language === 'zh-CN' ? '登录状态已失效，请重新登录后再保存。' : 'Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      // 非鉴权错误时，允许本地保存，保证“我的新闻”可用
      const localEntry = buildEntryFromSettings(completeSettings, keywordStrings);
      const nextEntries = localEntry ? [...pushEntries, localEntry] : pushEntries;
      saveLocalCachedEntries(nextEntries.map(serializePushEntry));
      setPushEntries(nextEntries);
      resetSettingsForm();
      setActiveSection('my-news');
      navigate('/home/news-push?tab=my-news');
      alert(language === 'zh-CN' ? '网络异常，已暂存到本地。' : 'Network issue, saved locally for now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePush = async (id: string) => {
    const nextEntries = pushEntries.filter((p) => p.id !== id);
    setPushEntries(nextEntries);
    saveLocalCachedEntries(nextEntries.map(serializePushEntry));
    try {
      await userSettingsApi.updatePushSettingsList(nextEntries.map(serializePushEntry));
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      const isUnauthorized = msg.includes('unauthorized') || msg.includes('401');
      if (isUnauthorized) {
        localStorage.removeItem('access_token');
        alert(language === 'zh-CN' ? '登录状态已失效，请重新登录后再删除。' : 'Session expired. Please log in again.');
        navigate('/login');
      }
    }
    if (selectedEntryId === id) {
      navigate('/home/news-push?tab=my-news');
    }
  };

  const openPushEntryNews = (entry: PushEntry) => {
    navigate(
      `/home/news-push/${entry.id}/news?keywords=${encodeURIComponent(entry.keywords.join(','))}`
    );
  };

  const getPushDaysText = () => {
    if (pushSettings.everyday) return t('everyday');
    const sep = language === 'zh-CN' ? '、' : ', ';
    return pushSettings.pushDays.length > 0
      ? weekDays
          .slice(0, -1)
          .filter((d) => pushSettings.pushDays.includes(d.value))
          .map((d) => d.label)
          .join(sep)
      : t('notSet');
  };

  const getEntryDaysText = (entry: PushEntry) => {
    if (entry.everyday) return t('everyday');
    const sep = language === 'zh-CN' ? '、' : ', ';
    return entry.pushDays.length > 0
      ? weekDays
          .slice(0, -1)
          .filter((d) => entry.pushDays.includes(d.value))
          .map((d) => d.label)
          .join(sep)
      : t('notSet');
  };

  const isFormComplete = () => {
    const hasDays = pushSettings.everyday || pushSettings.pushDays.length > 0;
    const hasTimes = pushSettings.pushTimes.length > 0;
    const hasCount = pushSettings.pushCount > 0;
    const hasKeywords = keywords.length > 0;
    return hasDays && hasTimes && hasCount && hasKeywords;
  };

  const handleSwitchSection = (section: 'settings' | 'my-news') => {
    setActiveSection(section);
    if (section === 'settings') {
      if (selectedEntryId || searchParams.get('tab') === 'my-news') {
        navigate('/home/news-push');
      }
      return;
    }

    if (!selectedEntryId) {
      navigate('/home/news-push?tab=my-news');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={heroTitle}
        description={heroDescription}
        icon={Zap}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/home')}
          className="rounded-xl border-slate-200 bg-white hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleSwitchSection('settings')}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
              activeSection === 'settings'
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
            }`}
          >
            <Clock className="h-4 w-4" />
            {t('pushSettings')}
          </button>
          <button
            type="button"
            onClick={() => handleSwitchSection('my-news')}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
              activeSection === 'my-news'
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            {t('myNews')}
          </button>
        </div>

        {activeSection === 'settings' ? (
          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t('pushDays')}</h3>
                    <p className="text-xs text-gray-500">{t('selectReceiveDates')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {weekDays.map((day) => {
                    const isChecked =
                      day.value === 'everyday'
                        ? pushSettings.everyday
                        : pushSettings.pushDays.includes(day.value);
                    return (
                      <label
                        key={day.value}
                        htmlFor={day.value}
                        className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all border-2 ${
                          isChecked
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <Checkbox
                          id={day.value}
                          checked={isChecked}
                          onCheckedChange={() => handleDayToggle(day.value)}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">{day.label}</span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t('pushTimes')}</h3>
                    <p className="text-xs text-gray-500">{t('setDailyPushTime')}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    type="text"
                    value={newTimeInput}
                    onChange={(e) => setNewTimeInput(e.target.value)}
                    placeholder={t('inputHour')}
                    className="w-28 rounded-xl h-11"
                  />
                  <Button
                    onClick={addTime}
                    variant="outline"
                    className="rounded-xl h-11"
                    disabled={!validateAndFormatTime(newTimeInput)}
                  >
                    {t('addTime')}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">{t('range')}</p>
                {pushSettings.pushTimes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {pushSettings.pushTimes.map((time) => (
                      <div
                        key={time}
                        className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-full text-sm"
                      >
                        <Clock className="w-4 h-4" />
                        <span>{time}</span>
                        <button
                          onClick={() => removeTime(time)}
                          className="hover:bg-white/20 rounded-full p-0.5"
                          aria-label="remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">{t('notSetPushTime')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Hash className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t('pushCount')}</h3>
                    <p className="text-xs text-gray-500">{t('newsCountPerTime')}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <Input
                    type="number"
                    value={customCount}
                    onChange={handleCountChange}
                    min={1}
                    max={20}
                    className="max-w-[140px] rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm font-medium">{t('pushCountPerTimeMax')}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {language === 'zh-CN' ? '添加关键词' : 'Add Keywords'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {language === 'zh-CN'
                        ? '一个输入框内最多允许 3 个关键词（可用逗号分隔）'
                        : 'Up to 3 keywords in one input box (comma-separated supported).'}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {keywords.length}/3
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddKeyword();
                    }}
                    placeholder={t('keywordPlaceholder')}
                    className="flex-1 rounded-xl border-slate-200 h-11"
                  />
                  <Button
                    onClick={handleAddKeyword}
                    disabled={keywords.length >= 3}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 disabled:bg-slate-300"
                  >
                    {language === 'zh-CN' ? '添加' : 'Add'}
                  </Button>
                </div>
                {keywordError ? (
                  <p className="text-xs text-red-500">{keywordError}</p>
                ) : (
                  <p className="text-xs text-gray-500">{t('keywordTip')}</p>
                )}
                {keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span
                        key={keyword.id}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-sm"
                      >
                        {keyword.keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(keyword.id)}
                          className="rounded-full p-0.5 hover:bg-indigo-200"
                          aria-label={language === 'zh-CN' ? '移除关键词' : 'Remove keyword'}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    {language === 'zh-CN' ? '请至少添加 1 个关键词' : 'Please add at least 1 keyword'}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50/50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-gray-900">{t('currentSettingsPreview')}</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex gap-3">
                    <span className="font-medium min-w-[80px]">{t('pushDateLabel')}</span>
                    <span>{getPushDaysText()}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-medium min-w-[80px]">{t('pushTimeLabel')}</span>
                    <span>
                      {pushSettings.pushTimes.length > 0
                        ? pushSettings.pushTimes.join(language === 'zh-CN' ? '、' : ', ')
                        : t('notSet')}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-medium min-w-[80px]">{t('pushCount')}:</span>
                    <span>
                      {pushSettings.pushCount}
                      {t('pushCountPerTimePreview')}
                    </span>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex gap-3">
                      <span className="font-medium min-w-[80px]">{t('keywordLabel')}</span>
                      <span className="text-indigo-600 font-semibold">
                        {keywords.map((k) => k.keyword).join(language === 'zh-CN' ? '、' : ', ')}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving || isLoading || !isFormComplete()}
                  className={`w-full sm:w-auto rounded-xl h-12 px-8 ${
                    isFormComplete()
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? t('saving') : isLoading ? t('loading') : (
                    <>
                      {t('confirmSettings')}
                      <ArrowRight className="w-4 h-4 ml-2 inline" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-slate-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    {language === 'zh-CN' ? '推送统计' : 'Push Statistics'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                      <p className="text-sm text-indigo-600 font-semibold">
                        {language === 'zh-CN' ? '今日推送' : 'Today'}
                      </p>
                      <p className="text-3xl font-bold text-indigo-700 mt-2">2</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <p className="text-sm text-purple-600 font-semibold">
                        {language === 'zh-CN' ? '本周推送' : 'This Week'}
                      </p>
                      <p className="text-3xl font-bold text-purple-700 mt-2">14</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <p className="text-sm text-blue-600 font-semibold">
                        {language === 'zh-CN' ? '本月推送' : 'This Month'}
                      </p>
                      <p className="text-3xl font-bold text-blue-700 mt-2">52</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="space-y-3">
              <div className="flex items-center justify-between mt-2">
                <h3 className="text-lg font-bold text-gray-900">{t('pushList')}</h3>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {viewMode === 'list' ? (
                pushEntries.length > 0 ? (
                  pushEntries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedEntryId === entry.id
                            ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-blue-600'
                        }`}
                        onClick={() => openPushEntryNews(entry)}
                      >
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 mb-1">{t('newsKeywords')}</p>
                              <p className="text-lg font-semibold text-gray-900 line-clamp-2">
                                {entry.keywords.join(language === 'zh-CN' ? '、' : ', ')}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-gray-500">
                                <span>
                                  {t('pushDateLabel')} {getEntryDaysText(entry)}
                                </span>
                                <span>
                                  {t('pushTimeLabel')} {entry.pushTimes.join(language === 'zh-CN' ? '、' : ', ')}
                                </span>
                                <span>
                                  {t('pushCount')} {entry.pushCount}
                                  {t('pushCountPerTimePreview')}
                                </span>
                              </div>
                            </div>
                            <div
                              className="flex items-center shrink-0 self-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 min-w-[112px] rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePush(entry.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                {language === 'zh-CN' ? '删除' : 'Delete'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <Card className="border-slate-200">
                    <CardContent className="p-6 text-center text-gray-500">
                      {language === 'zh-CN'
                        ? '暂无推送入口，请先完成设置'
                        : 'No push entries yet. Complete settings first.'}
                    </CardContent>
                  </Card>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pushEntries.length > 0 ? (
                    pushEntries.map((entry, index) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card
                          className={`h-full min-h-[240px] flex flex-col cursor-pointer transition-all hover:shadow-md ${
                            selectedEntryId === entry.id
                              ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border hover:border-blue-600'
                          }`}
                          onClick={() => openPushEntryNews(entry)}
                        >
                          <CardContent className="p-5 flex-1">
                            <p className="text-xs text-gray-500 mb-1">{t('newsKeywords')}</p>
                            <p className="text-lg font-semibold text-gray-900 line-clamp-3 mb-2">
                              {entry.keywords.join(language === 'zh-CN' ? '、' : ', ')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('pushDateLabel')} {getEntryDaysText(entry)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('pushTimeLabel')} {entry.pushTimes.join(language === 'zh-CN' ? '、' : ', ')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('pushCount')} {entry.pushCount}
                              {t('pushCountPerTimePreview')}
                            </p>
                          </CardContent>
                          <div
                            className="p-5 pt-0 flex flex-col gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePush(entry.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              {language === 'zh-CN' ? '删除' : 'Delete'}
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full">
                      <Card className="border-slate-200">
                        <CardContent className="p-6 text-center text-gray-500">
                          {language === 'zh-CN'
                            ? '暂无推送入口，请先完成设置'
                            : 'No push entries yet. Complete settings first.'}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {selectedEntryId && (
                <Card className="border-indigo-200 bg-indigo-50/50">
                  <CardContent className="p-4 text-sm text-indigo-700">
                    {language === 'zh-CN'
                      ? '当前已在“我的新闻”页面查看所选推送入口。'
                      : 'You are viewing the selected push entry in the "My News" tab.'}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
