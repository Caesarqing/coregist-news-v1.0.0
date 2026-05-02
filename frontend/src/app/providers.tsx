import type { ReactNode } from 'react';
import { LanguageProvider } from '~/contexts/LanguageContext';
import { FirebaseAuthProvider } from '~/contexts/FirebaseAuthContext';
import { ThemeProvider } from '~/shared/providers/theme-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
