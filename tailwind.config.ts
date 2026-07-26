import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#10263d",
          50: "#f2f5f8",
          100: "#dce4eb",
          600: "#27435d",
          700: "#19344e",
          800: "#10263d",
          900: "#081827",
        },
        brand: {
          DEFAULT: "#c75508",
          50: "#fff4ea",
          100: "#ffe0c7",
          400: "#ff9b52",
          500: "#ff8426",
          600: "#d95d08",
          700: "#a94305",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      screens: {
        "3xl": "1920px",
        "4xl": "2560px",
      },
      container: {
        center: true,
        padding: "1rem",
        screens: {
          "2xl": "1280px",
        },
      },
    },
  },
  plugins: [],
};

export default config;
