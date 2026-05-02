export interface ThemeBrandScale {
  50: string;
  100: string;
  500: string;
  600: string;
}

export interface ThemeSidebar {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  ring: string;
}

export interface SemanticTheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  primaryGlow: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  inputBackground: string;
  switchBackground: string;
  ring: string;
  brand: ThemeBrandScale;
  chart: readonly string[];
  sidebar: ThemeSidebar;
}

export const lightTheme: SemanticTheme = {
  background: '#f5f7fa',
  foreground: '#0f172a',
  card: 'rgba(255, 255, 255, 0.82)',
  cardForeground: '#0f172a',
  popover: 'rgba(255, 255, 255, 0.95)',
  popoverForeground: '#0f172a',
  primary: '#2563eb',
  primaryForeground: '#f0f6ff',
  primaryGlow: 'rgba(37, 99, 235, 0.35)',
  secondary: '#dbeafe',
  secondaryForeground: '#1e3a8a',
  muted: '#eef2f8',
  mutedForeground: '#5a6e8a',
  accent: '#eff6ff',
  accentForeground: '#1e3a8a',
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',
  border: 'rgba(210, 220, 235, 0.7)',
  input: 'transparent',
  inputBackground: 'rgba(255, 255, 255, 0.9)',
  switchBackground: '#94a3b8',
  ring: '#3b82f6',
  brand: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#2563eb',
    600: '#1d4ed8',
  },
  chart: ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
  sidebar: {
    background: 'rgba(255, 255, 255, 0.9)',
    foreground: '#0f1720',
    primary: '#2563eb',
    primaryForeground: '#f8fbff',
    accent: '#eff6ff',
    accentForeground: '#1f2937',
    border: 'rgba(210, 220, 235, 0.5)',
    ring: '#3b82f6',
  },
};

export const darkTheme: SemanticTheme = {
  background: '#0c0e14',
  foreground: '#e2e8f4',
  card: 'rgba(14, 20, 32, 0.72)',
  cardForeground: '#e2e8f4',
  popover: 'rgba(14, 20, 32, 0.95)',
  popoverForeground: '#e2e8f4',
  primary: '#4d9fff',
  primaryForeground: '#030d1a',
  primaryGlow: 'rgba(77, 159, 255, 0.4)',
  secondary: '#162035',
  secondaryForeground: '#b8d0f5',
  muted: '#111827',
  mutedForeground: '#7d8fa3',
  accent: '#1a2e50',
  accentForeground: '#c8deff',
  destructive: '#ef4444',
  destructiveForeground: '#fff8f8',
  border: 'rgba(38, 55, 84, 0.5)',
  input: 'rgba(10, 18, 32, 0.6)',
  inputBackground: 'rgba(12, 20, 35, 0.8)',
  switchBackground: '#475569',
  ring: '#4d9fff',
  brand: {
    50: '#1a2e50',
    100: '#203a66',
    500: '#4d9fff',
    600: '#3b82f6',
  },
  chart: ['#4d9fff', '#3b82f6', '#2563eb', '#1d4ed8', '#93c5fd'],
  sidebar: {
    background: 'rgba(14, 20, 32, 0.9)',
    foreground: '#e2e8f4',
    primary: '#4d9fff',
    primaryForeground: '#030d1a',
    accent: '#111827',
    accentForeground: '#c8deff',
    border: 'rgba(38, 55, 84, 0.4)',
    ring: '#4d9fff',
  },
};

export const semanticThemes = {
  light: lightTheme,
  dark: darkTheme,
} as const;
