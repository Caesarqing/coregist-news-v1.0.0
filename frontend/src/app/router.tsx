import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '~/shared/components/ProtectedRoute';
import { PrivacyPolicyPage } from '~/shared/components/legal/PrivacyPolicyPage';
import { TermsOfUsePage } from '~/shared/components/legal/TermsOfUsePage';
import { LegalPagesLayout } from '~/shared/layouts/LegalPagesLayout';
import { MainLayout } from '~/shared/layouts/MainLayout';
import { ForgotPasswordPage as ForgotPassword } from '~/pages/auth/ForgotPassword';
import { LoginPage as Login } from '~/pages/auth/Login';
import { RegisterPage as Register } from '~/pages/auth/Register';
import { HomePage as Home } from '~/pages/home/Home';
import { LandingPage as Landing } from '~/pages/landing/Landing';
import { NewsDetailPage as NewsDetail } from '~/pages/news/Detail';
import { NewsPageSimplified as NewsList } from '~/pages/news/ListSimplified';
import { ProfilePage as Profile } from '~/pages/profile/Profile';
import { NewsDataDetailPage as NewsDataDetail } from '~/pages/products/NewsDataDetail';
import { NewsDataMySpacePage as NewsDataMySpace } from '~/pages/products/NewsDataMySpace';
import { NewsDataPage as NewsData } from '~/pages/products/NewsData';
import { NewsPushNewsListPage as NewsPushNewsList } from '~/pages/products/NewsPushNewsList';
import { NewsPushPage as NewsPush } from '~/pages/products/NewsPush';
import { TargetedTrackingTimelinePage as TargetedTrackingTimeline } from '~/pages/products/TargetedTrackingTimeline';
import { TargetedTrackingPage as TargetedTracking } from '~/pages/products/TargetedTracking';
import { EditProfilePage as EditProfile } from '~/pages/settings/EditProfile';
import { GeneralSettingsPage as GeneralSettings } from '~/pages/settings/GeneralSettings';
import { HelpFeedbackPage as HelpFeedback } from '~/pages/settings/HelpFeedback';
import { NotificationSettingsPage as NotificationSettings } from '~/pages/settings/NotificationSettings';
import { PrivacySettingsPage as PrivacySettings } from '~/pages/settings/PrivacySettings';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ 渲染错误:', error);
    console.error('详情:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
          <h1>❌ 应用崩溃</h1>
          <p>{this.state.error?.message}</p>
          <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()}>重新加载</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AppRouter() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/privacy" element={<LegalPagesLayout><PrivacyPolicyPage /></LegalPagesLayout>} />
          <Route path="/terms" element={<LegalPagesLayout><TermsOfUsePage /></LegalPagesLayout>} />

          <Route path="/news-push" element={<Navigate to="/login?return_url=%2Fhome%2Fnews-push" replace />} />
          <Route path="/news-data" element={<Navigate to="/login?return_url=%2Fhome%2Fnews-data" replace />} />
          <Route path="/targeted-tracking" element={<Navigate to="/login?return_url=%2Fhome%2Ftargeted-tracking" replace />} />

          <Route
            path="/home"
            element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
          >
            <Route index element={<Home />} />
            <Route path="news-push" element={<NewsPush />} />
            <Route path="news-push/:id" element={<NewsPush />} />
            <Route path="news-push/:id/news" element={<NewsPushNewsList />} />
            <Route path="news-data" element={<NewsData />} />
            <Route path="news-data/:id" element={<NewsDataDetail />} />
            <Route path="news-data/my-space" element={<NewsDataMySpace />} />
            <Route path="news-data/my-space/:id" element={<NewsDataDetail />} />
            <Route path="targeted-tracking" element={<TargetedTracking />} />
            <Route path="targeted-tracking/:id" element={<TargetedTrackingTimeline />} />
          </Route>

          <Route
            path="/news"
            element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
          >
            <Route index element={<NewsList />} />
            <Route path=":id" element={<NewsDetail />} />
          </Route>

          <Route
            path="/profile"
            element={<ProtectedRoute><MainLayout /></ProtectedRoute>}
          >
            <Route index element={<Profile />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="notification" element={<NotificationSettings />} />
            <Route path="privacy" element={<PrivacySettings />} />
            <Route path="edit-profile" element={<EditProfile />} />
            <Route path="help" element={<HelpFeedback />} />
            <Route path="terms" element={<TermsOfUsePage />} />
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
