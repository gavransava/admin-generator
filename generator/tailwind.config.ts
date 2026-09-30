import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../packages/admin-ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f5f7ed",
          100: "#e7ecd2",
          200: "#d0daaa",
          300: "#b3c47c",
          400: "#93aa54",
          500: "#78913a",
          600: "#5e742d",
          700: "#586c31",
          800: "#3f4e22",
          900: "#333f1e",
        },
        beige: {
          50: "#fbf8ef",
          100: "#f4ecd8",
          200: "#e8dab7",
          300: "#d9c48c",
          400: "#c6a76a",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
