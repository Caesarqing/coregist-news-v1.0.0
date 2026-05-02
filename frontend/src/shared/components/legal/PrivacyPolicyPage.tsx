import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '~/shared/ui/button';
import { useLanguage } from '~/contexts/LanguageContext';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const content = {
    'en': {
      title: 'Privacy Policy – Coregist News',
      intro: 'This Privacy Policy applies to Coregist News (https://coregist-news.com), an AI-powered news aggregation and summarization platform primarily serving users in North America and Europe.\nBy accessing or using our services, you acknowledge that you have read, understood, and agreed to this Privacy Policy.',
      sections: [
        {
          title: '1. Information We Collect',
          content: 'We may collect information that you voluntarily provide, as well as information automatically collected when you use our services, including but not limited to:\n• Email address (if provided)\n• IP address\n• Device and browser information\n• Usage logs, interaction data, and access time\n• Cookies and similar tracking technologies\n\nWe may also generate anonymized or aggregated data derived from user activity for analytics and AI optimization purposes.'
        },
        {
          title: '2. Purpose of Data Processing',
          content: 'We use collected information for the following purposes:\n• To provide, operate, and improve our services\n• To personalize content delivery\n• To enhance AI models and algorithms\n• To monitor security and prevent abuse\n• To comply with legal obligations'
        },
        {
          title: '3. Cookies and Tracking Technologies',
          content: 'We use cookies and similar technologies to enhance user experience, analyze usage trends, and optimize service performance.\nUsers located in the European Economic Area (EEA) may manage cookie preferences in accordance with applicable laws.'
        },
        {
          title: '4. Data Sharing and International Transfers',
          content: 'We do not sell personal information.\nWe may share anonymized or aggregated data with third-party service providers for analytics, hosting, or technical support.\nYour information may be transferred to and processed in countries outside your country of residence.'
        },
        {
          title: '5. Data Retention',
          content: 'We retain personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law.'
        },
        {
          title: '6. User Rights (GDPR & CCPA)',
          content: 'Depending on your jurisdiction, you may have the right to:\n• Access your personal data\n• Request correction or deletion\n• Restrict or object to processing\n• Withdraw consent\n\nRequests can be submitted via email at coregistnews@gmail.com.'
        },
        {
          title: '7. Data Security',
          content: 'We implement reasonable technical and organizational safeguards to protect your information.\nHowever, no data transmission or storage system can be guaranteed to be 100% secure.'
        },
        {
          title: '8. Children\'s Privacy',
          content: 'Our services are not intended for children under the age of 13 (or 16 in the EEA).\nWe do not knowingly collect personal data from children.'
        },
        {
          title: '9. Changes to This Policy',
          content: 'We may update this Privacy Policy from time to time.\nChanges will be effective upon posting on the website.'
        },
        {
          title: '10. Contact Us',
          content: 'Email: coregistnews@gmail.com'
        }
      ]
    },
    'zh-CN': {
      title: '隐私政策 – Coregist News',
      intro: '本隐私政策适用于 Coregist News (https://coregist-news.com)，这是一个主要服务北美和欧洲用户的AI驱动新闻聚合和摘要平台。\n通过访问或使用我们的服务，您承认已阅读、理解并同意本隐私政策。',
      sections: [
        {
          title: '1. 我们收集的信息',
          content: '我们可能收集您自愿提供的信息，以及您使用我们服务时自动收集的信息，包括但不限于：\n• 电子邮件地址（如提供）\n• IP地址\n• 设备和浏览器信息\n• 使用日志、交互数据和访问时间\n• Cookie和类似跟踪技术\n\n我们可能还会生成从用户活动中得出的匿名或聚合数据，用于分析和AI优化目的。'
        },
        {
          title: '2. 数据处理的目的',
          content: '我们将收集的信息用于以下目的：\n• 提供、运营和改进我们的服务\n• 个性化内容交付\n• 增强AI模型和算法\n• 监控安全并防止滥用\n• 遵守法律义务'
        },
        {
          title: '3. Cookie和跟踪技术',
          content: '我们使用Cookie和类似技术来增强用户体验、分析使用趋势并优化服务性能。\n位于欧洲经济区（EEA）的用户可以根据适用法律管理Cookie偏好。'
        },
        {
          title: '4. 数据共享和国际传输',
          content: '我们不出售个人信息。\n我们可能与第三方服务提供商共享匿名或聚合数据，用于分析、托管或技术支持。\n您的信息可能被传输到您居住国以外的国家/地区进行处理。'
        },
        {
          title: '5. 数据保留',
          content: '我们仅在实现本政策中概述的目的所必需的时间内保留个人信息，除非法律要求或允许更长的保留期。'
        },
        {
          title: '6. 用户权利（GDPR和CCPA）',
          content: '根据您的司法管辖区，您可能有权：\n• 访问您的个人数据\n• 请求更正或删除\n• 限制或反对处理\n• 撤回同意\n\n请求可以通过电子邮件提交至 coregistnews@gmail.com。'
        },
        {
          title: '7. 数据安全',
          content: '我们实施合理的技术和组织保障措施来保护您的信息。\n但是，不能保证任何数据传输或存储系统100%安全。'
        },
        {
          title: '8. 儿童隐私',
          content: '我们的服务不适用于13岁（或在EEA为16岁）以下的儿童。\n我们不会故意收集儿童的个人数据。'
        },
        {
          title: '9. 本政策的变更',
          content: '我们可能会不时更新本隐私政策。\n变更将在网站上发布后生效。'
        },
        {
          title: '10. 联系我们',
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
