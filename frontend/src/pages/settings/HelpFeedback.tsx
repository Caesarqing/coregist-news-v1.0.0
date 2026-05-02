import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '~/shared/ui/card';
import { Button } from '~/shared/ui/button';
import { Input } from '~/shared/ui/input';
import { Label } from '~/shared/ui/label';
import { Textarea } from '~/shared/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/shared/ui/accordion';
import { ArrowLeft, HelpCircle, MessageSquare, Star, Mail, Phone, Globe } from 'lucide-react';
import { useLanguage } from '~/contexts/LanguageContext';
import { PageHero } from '~/shared/components/PageHero';

export function HelpFeedbackPage() {
  const navigate = useNavigate();
  const onBack = () => navigate('/profile');
  const { language, t } = useLanguage();
  const [feedbackText, setFeedbackText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [rating, setRating] = useState(0);

  const heroDescription =
    language === 'zh-CN'
      ? '查看常见问题并提交反馈，帮助我们持续优化体验'
       : 'Find FAQ and send feedback to help improve the product';

  const handleSubmitFeedback = () => {
    console.log('Submit feedback:', { feedbackText, contactEmail, rating });
    setFeedbackText('');
    setContactEmail('');
    setRating(0);
  };

  const faqData = [
    {
      question: t('howToSetPersonalizedPush'),
      answer: t('howToSetPersonalizedPushAnswer'),
    },
    {
      question: t('whatAreRefreshPoints'),
      answer: t('whatAreRefreshPointsAnswer'),
    },
    {
      question: t('howToChangeNotificationSettings'),
      answer: t('howToChangeNotificationSettingsAnswer'),
    },
    {
      question: t('whyNoNewsPush'),
      answer: t('whyNoNewsPushAnswer'),
    },
    {
      question: t('howToDeleteReadingHistory'),
      answer: t('howToDeleteReadingHistoryAnswer'),
    },
    {
      question: t('howToChangeProfile'),
      answer: t('howToChangeProfileAnswer'),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHero
        title={t('helpAndFeedback')}
        description={heroDescription}
        icon={HelpCircle}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
        </div>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <HelpCircle className="w-5 h-5 text-primary" />
              </div>
              {t('frequentlyAskedQuestions')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6">
            <Accordion type="single" collapsible className="w-full">
              {faqData.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-border">
                  <AccordionTrigger className="text-left text-foreground font-medium hover:text-primary transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              {t('feedback')}
            </h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-5">
            <div className="space-y-3">
              <p className="text-foreground font-medium">{t('satisfactionQuestion')}</p>
              <div className="flex gap-2 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant="ghost"
                    size="icon"
                    onClick={() => setRating(star)}
                    className="p-2 rounded-xl"
                  >
                    <Star className={`w-7 h-7 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium text-sm">{t('detailedFeedback')}</Label>
              <Textarea
                placeholder={t('describeProblemsOrSuggestions')}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-32 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium text-sm">{t('contactEmailOptional')}</Label>
              <Input
                type="email"
                placeholder={t('yourEmailAddress')}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-muted-foreground text-xs">{t('provideEmailForReply')}</p>
            </div>

            <Button
              onClick={handleSubmitFeedback}
              className="w-full rounded-xl h-11 text-white"
              disabled={!feedbackText.trim()}
            >
              {t('submitFeedback')}
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold">{t('contactUs')}</h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-3">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
              <div className="p-2 bg-muted rounded-lg">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('emailSupport')}</p>
                <p className="text-muted-foreground text-sm">support@newsapp.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
              <div className="p-2 bg-muted rounded-lg">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('customerServiceHotline')}</p>
                <p className="text-muted-foreground text-sm">400-888-8888</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted rounded-xl border border-border">
              <div className="p-2 bg-muted rounded-lg">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-medium">{t('officialWebsite')}</p>
                <p className="text-muted-foreground text-sm">www.newsapp.com</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2 px-6 pt-6">
            <h3 className="text-foreground text-lg font-semibold">{t('appInformation')}</h3>
          </CardHeader>
          <CardContent className="pt-2 px-6 pb-6 space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground font-medium">{t('version')}</span>
              <span className="text-foreground font-semibold">v2.1.0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-muted-foreground font-medium">{t('updateTime')}</span>
              <span className="text-foreground font-semibold">2025-01-20</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-muted-foreground font-medium">{t('appSize')}</span>
              <span className="text-foreground font-semibold">45.2 MB</span>
            </div>

            <div className="pt-4 space-y-2 border-t border-border">
              <Button variant="outline" className="w-full rounded-xl h-11">
                {t('checkForUpdates')}
              </Button>
              <Button variant="outline" className="w-full rounded-xl h-11">
                {t('userAgreement')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
