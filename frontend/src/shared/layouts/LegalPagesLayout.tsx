import { AuthNavigation } from '~/shared/components/AuthNavigation';

interface LegalPagesLayoutProps {
  children: React.ReactNode;
}

export function LegalPagesLayout({ children }: LegalPagesLayoutProps) {
  return (
    <>
      <AuthNavigation />
      {children}
    </>
  );
}
