import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0f2540",
          50: "#eef3f9",
          100: "#d3e0ef",
          600: "#173a63",
          700: "#12304f",
          800: "#0f2540",
          900: "#0a1a2e",
        },
        brand: {
          DEFAULT: "#f5851f",
          50: "#fef4e8",
          100: "#fde4c6",
          400: "#f79b42",
          500: "#f5851f",
          600: "#e0720f",
          700: "#b95a0c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
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
