/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        border:      "var(--border)",
        input:       "var(--input)",
        ring:        "var(--ring)",
        background:  "var(--background)",
        foreground:  "var(--foreground)",
        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT:    "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT:    "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT:              "var(--sidebar)",
          foreground:           "var(--sidebar-foreground)",
          primary:              "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent:               "var(--sidebar-accent)",
          "accent-foreground":  "var(--sidebar-accent-foreground)",
          border:               "var(--sidebar-border)",
          ring:                 "var(--sidebar-ring)",
        },
      },
      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        xl:   "calc(var(--radius) + 4px)",
        "2xl":"calc(var(--radius) + 8px)",
        full: "9999px",
      },
      boxShadow: {
        "ai-glow":
          "0 0 0 1px rgba(37,99,235,0.3), 0 4px 24px rgba(37,99,235,0.35), 0 1px 4px rgba(0,0,0,0.12)",
        "ai-glow-lg":
          "0 0 0 1px rgba(37,99,235,0.2), 0 8px 40px rgba(37,99,235,0.3), 0 2px 8px rgba(0,0,0,0.1)",
        "card-glass":
          "0 8px 32px rgba(15,23,42,0.12), 0 1px 3px rgba(15,23,42,0.06)",
        "card-glass-hover":
          "0 16px 48px rgba(15,23,42,0.18), 0 2px 6px rgba(15,23,42,0.08)",
        "nav-pill":
          "0 8px 32px rgba(15,23,42,0.18), 0 1px 4px rgba(15,23,42,0.08)",
      },
      keyframes: {
        "ai-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%":       { opacity: "0.6", transform: "scale(0.85)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "glow-breathe": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(37,99,235,0.3)" },
          "50%":       { boxShadow: "0 0 28px rgba(37,99,235,0.6)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "25%":       { transform: "translate(20px,-50px) scale(1.1)" },
          "50%":       { transform: "translate(-20px,20px) scale(0.9)" },
          "75%":       { transform: "translate(50px,50px) scale(1.05)" },
        },
      },
      animation: {
        "ai-pulse":     "ai-pulse 2s ease-in-out infinite",
        "fade-in-up":   "fade-in-up 0.5s ease forwards",
        "glow-breathe": "glow-breathe 3s ease-in-out infinite",
        blob:           "blob 7s infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
}
