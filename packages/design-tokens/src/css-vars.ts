import { darkTheme, lightTheme } from './themes';

function toCssVars(theme: typeof lightTheme) {
  return {
    '--background': theme.background,
    '--foreground': theme.foreground,
    '--card': theme.card,
    '--card-foreground': theme.cardForeground,
    '--popover': theme.popover,
    '--popover-foreground': theme.popoverForeground,
    '--primary': theme.primary,
    '--primary-foreground': theme.primaryForeground,
    '--primary-glow': theme.primaryGlow,
    '--secondary': theme.secondary,
    '--secondary-foreground': theme.secondaryForeground,
    '--muted': theme.muted,
    '--muted-foreground': theme.mutedForeground,
    '--accent': theme.accent,
    '--accent-foreground': theme.accentForeground,
    '--destructive': theme.destructive,
    '--destructive-foreground': theme.destructiveForeground,
    '--border': theme.border,
    '--input': theme.input,
    '--input-background': theme.inputBackground,
    '--switch-background': theme.switchBackground,
    '--ring': theme.ring,
    '--brand-50': theme.brand[50],
    '--brand-100': theme.brand[100],
    '--brand-500': theme.brand[500],
    '--brand-600': theme.brand[600],
  } as const;
}

export const lightCssVars = toCssVars(lightTheme);
export const darkCssVars = toCssVars(darkTheme);
