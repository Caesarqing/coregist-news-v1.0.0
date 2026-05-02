import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '~/shared/ui/button';
import { Input } from '~/shared/ui/input';
import { Card, CardContent, CardHeader } from '~/shared/ui/card';
import { useLanguage } from '~/contexts/LanguageContext';
import { AuthNavigation } from '~/shared/components/AuthNavigation';
import { useFirebaseAuth } from '~/contexts/FirebaseAuthContext';

type Step = 'input' | 'sent';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { sendPasswordReset } = useFirebaseAuth();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const content = {
    'en': {
      title: 'Forgot Password',
      description: 'Enter your email to receive a password reset link',
      emailPlaceholder: 'Email address',
      sendResetEmail: 'Send Reset Email',
      backToLogin: 'Back to Login',
      sending: 'Sending...',
      emailSent: 'Email Sent',
      emailSentDescription: 'A password reset email has been sent to {email}. Please check your inbox and follow the instructions.',
      checkSpam: 'If you don\'t see the email, please check your spam folder.',
      resendEmail: 'Resend Email',
    },
    'zh-CN': {
      title: '忘记密码',
      description: '请输入您的邮箱以接收密码重置链接',
      emailPlaceholder: '邮箱地址',
      sendResetEmail: '发送重置邮件',
      backToLogin: '返回登录',
      sending: '发送中...',
      emailSent: '邮件已发送',
      emailSentDescription: '密码重置邮件已发送到 {email}，请查收并按照邮件中的说明重置密码。',
      checkSpam: '如果没有收到邮件，请检查垃圾邮件文件夹。',
      resendEmail: '重新发送邮件',
    },
  };

  const currentContent = content[language] || content['en'];

  // 使用 Firebase 发送密码重置邮件
  const handleSendResetEmail = async () => {
    if (!email) {
      setError(language === 'zh-CN' ? '请输入邮箱地址' : 'Please enter your email address');
      return;
    }

    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(language === 'zh-CN' ? '请输入有效的邮箱地址' : 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendPasswordReset(email);
      setStep('sent');
    } catch (error: any) {
      console.error('发送密码重置邮件失败:', error);
      setError(error.message || (language === 'zh-CN' ? '发送失败，请稍后重试' : 'Failed to send reset email'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthNavigation />
      <div className="flex items-center justify-center p-4 sm:p-6 min-h-screen pt-24 sm:pt-32">
        <Card className="w-full max-w-md border-border/50 backdrop-blur-xl">
          <CardHeader className="text-center space-y-2 pb-4 px-6 pt-6 relative">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="absolute left-4 top-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">{currentContent.title}</h1>
            <p className="text-muted-foreground text-sm">{currentContent.description}</p>
          </CardHeader>
          <CardContent className="pb-6 px-6">
            {step === 'input' ? (
              <div className="space-y-4">
                <Input
                  placeholder={currentContent.emailPlaceholder}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendResetEmail();
                    }
                  }}
                  className="h-11 sm:h-12 text-sm sm:text-base"
                  autoFocus
                />
                {error && (
                  <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg">
                    {error}
                  </div>
                )}
                
                <Button
                  onClick={handleSendResetEmail}
                  className="w-full h-11 sm:h-12 font-semibold text-sm sm:text-base
                             shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_28px_rgba(37,99,235,0.5)]"
                  disabled={isLoading || !email}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isLoading ? currentContent.sending : currentContent.sendResetEmail}
                </Button>

                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    className="text-sm text-primary hover:text-primary/90"
                  >
                    {currentContent.backToLogin}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {currentContent.emailSent}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {currentContent.emailSentDescription.replace('{email}', email)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentContent.checkSpam}
                  </p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full h-11 sm:h-12 font-semibold text-sm sm:text-base"
                  >
                    {currentContent.backToLogin}
                  </Button>
                  <Button
                    onClick={() => {
                      setStep('input');
                      setError('');
                    }}
                    variant="outline"
                    className="w-full h-11 sm:h-12 font-semibold text-sm sm:text-base"
                  >
                    {currentContent.resendEmail}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
      </Card>
      </div>
    </>
  );
}
