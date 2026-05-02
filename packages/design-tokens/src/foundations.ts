export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem',
} as const;

export const radius = {
  sm: '0.5rem',
  md: '0.85rem',
  lg: '1.25rem',
  pill: '9999px',
} as const;

export const shadows = {
  soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
  card: '0 18px 45px rgba(15, 23, 42, 0.10)',
  glow: '0 0 0 1px rgba(37, 99, 235, 0.14), 0 18px 40px rgba(37, 99, 235, 0.18)',
} as const;

export const typography = {
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  fontFamily: {
    body: "'Inter', 'SF Pro Display', 'Segoe UI', sans-serif",
    heading: "'Sora', 'Inter', sans-serif",
  },
} as const;
