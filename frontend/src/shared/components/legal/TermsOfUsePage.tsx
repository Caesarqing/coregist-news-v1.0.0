import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '~/shared/ui/button';
import { useLanguage } from '~/contexts/LanguageContext';

export function TermsOfUsePage() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const content = {
    'en': {
      title: 'Terms of Use – Coregist News',
      intro: 'Welcome to Coregist News (https://coregist-news.com). Coregist News is an AI-powered news aggregation and summarization platform that collects publicly available news content, analyzes it using artificial intelligence technologies, and provides users with summaries, highlights, and links to original sources.\n\nBy accessing or using the Service, you agree to be bound by these Terms of Use. If you do not agree, please do not use the Service.',
      sections: [
        {
          title: '1. Copyright and Content Disclaimer',
          content: 'Coregist News does not claim ownership of any third‑party news articles. All third‑party content remains the property of its respective copyright holders. Our Service provides AI‑generated summaries and extracts for informational purposes only, and always aims to include links to original sources.\n\nIf you are a copyright owner and believe your content has been used in a manner that constitutes infringement, please contact us at coregistnews@gmail.com. We will promptly review and take appropriate action, including removal where necessary.'
        },
        {
          title: '2. User Responsibilities',
          content: 'You agree not to reproduce, redistribute, or commercially exploit any content from the Service unless permitted by applicable law or authorized by the copyright holder.'
        },
        {
          title: '3. Limitation of Liability',
          content: 'The Service is provided "as is" and "as available." Coregist News disclaims all warranties to the maximum extent permitted by law and shall not be liable for any indirect, incidental, or consequential damages.'
        },
        {
          title: '4. Governing Law',
          content: 'These Terms shall be governed by and construed in accordance with generally accepted international commercial principles, without regard to conflict of law rules.'
        },
        {
          title: '5. Contact',
          content: 'Email: coregistnews@gmail.com'
        }
      ]
    },
    'zh-CN': {
      title: '用户使用协议 – Coregist News',
      intro: '欢迎使用 Coregist News (https://coregist-news.com)。Coregist News 是一个AI驱动的新闻聚合和摘要平台，收集公开可用的新闻内容，使用人工智能技术进行分析，并向用户提供摘要、亮点和原始来源链接。\n\n通过访问或使用本服务，您同意受本使用协议的约束。如果您不同意，请不要使用本服务。',
      sections: [
        {
          title: '1. 版权和内容免责声明',
          content: 'Coregist News 不主张对任何第三方新闻文章的所有权。所有第三方内容仍归其各自的版权持有者所有。我们的服务仅用于信息目的提供AI生成的摘要和摘录，并始终旨在包含原始来源的链接。\n\n如果您是版权所有者，并认为您的内容以构成侵权的方式被使用，请通过 coregistnews@gmail.com 与我们联系。我们将及时审查并采取适当行动，包括在必要时进行删除。'
        },
        {
          title: '2. 用户责任',
          content: '您同意不复制、重新分发或商业利用服务中的任何内容，除非适用法律允许或经版权持有者授权。'
        },
        {
          title: '3. 责任限制',
          content: '服务按"现状"和"可用"提供。Coregist News 在法律允许的最大范围内免除所有保证，不对任何间接、偶然或后果性损害承担责任。'
        },
        {
          title: '4. 适用法律',
          content: '本条款应根据普遍接受的国际商业原则进行管理和解释，不考虑法律冲突规则。'
        },
        {
          title: '5. 联系方式',
          content: '电子邮件：coregistnews@gmail.com'
        }
      ]
    },
  };

  const currentContent = content[language] || content['en'];
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background pt-24 sm:pt-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            {language === 'zh-CN' ? '返回'  : 'Back'}
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {currentContent.title}
          </h1>
          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
            {currentContent.intro}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {currentContent.sections.map((section, index) => (
            <div key={index} className="border-b border-border pb-6 last:border-b-0">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                {section.title}
              </h2>
              <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {section.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
