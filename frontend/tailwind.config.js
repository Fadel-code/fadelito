/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marca Fadelito (verificada em pmo.fadelito.com.br)
        primary: {
          DEFAULT: "#005BAE",
          50: "#eef4fb",
          100: "#d9e8f7",
          200: "#b3d0ef",
          300: "#7fb0e2",
          400: "#3d84cc",
          500: "#005BAE",
          600: "#1b4e9c",
          700: "#153f7d",
          800: "#0f2f5e",
          900: "#0a2047",
        },
        ink: {
          DEFAULT: "#001040",
          panel: "#001A4A",
        },
        sun: {
          DEFAULT: "#FFD800",
          soft: "#FAEC27",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
