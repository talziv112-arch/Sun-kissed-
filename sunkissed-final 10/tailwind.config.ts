import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FBF6EF",
          100: "#F4EADB",
          200: "#EBD9BF",
          300: "#DCBF95",
        },
        bronze: {
          400: "#C9905A",
          500: "#B0742F",
          600: "#925C1E",
          700: "#6E4416",
          800: "#3A2A1A",
        },
        amber: {
          accent: "#E0913A",
          deep: "#C9732B",
        },
        ink: "#241A12",
      },
      fontFamily: {
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
        display: ["var(--font-assistant)", "var(--font-heebo)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 20px 60px -20px rgba(201, 115, 43, 0.45)",
        card: "0 8px 30px -12px rgba(58, 42, 26, 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
