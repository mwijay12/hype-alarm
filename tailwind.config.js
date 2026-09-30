/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2563EB", // Electric Blue
          bright: "#3B82F6",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#0EA5E9", // Sky Blue
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F0F5FF",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#EFF6FF",
          foreground: "#1E40AF",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A",
        },
        // Electric Blue & White custom color palette
        hyper: {
          white: "#FFFFFF",
          canvas: "#F0F5FF",
          blue: "#2563EB",
          blueBright: "#3B82F6",
          sky: "#0EA5E9",
          slate: "#0F172A",
          muted: "#64748B",
          dim: "#94A3B8",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "16px",
        "3xl": "24px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Orbitron", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glass: "0 4px 24px rgba(37, 99, 235, 0.10)",
        "glow-active": "0 0 20px rgba(59, 130, 246, 0.25)",
        "glow-hover": "0 0 30px rgba(59, 130, 246, 0.35)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 15px rgba(59, 130, 246, 0.20)",
            borderColor: "rgba(59, 130, 246, 0.30)",
          },
          "50%": {
            boxShadow: "0 0 30px rgba(59, 130, 246, 0.45)",
            borderColor: "rgba(37, 99, 235, 0.60)",
          },
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(12px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-up": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out forwards",
        "fade-in": "fade-in 0.25s ease-out forwards",
        "scale-up": "scale-up 0.2s ease-out forwards",
      },
    },
  },
  plugins: [],
}
