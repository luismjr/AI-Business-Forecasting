/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        surface: {
          850: "#162032",
          900: "#0f172a",
          925: "#0c1222",
          950: "#080c18",
        },
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(52, 211, 153, 0.25)",
      },
    },
  },
  plugins: [],
};
