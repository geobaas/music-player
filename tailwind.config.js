/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        eq1: {
          "0%, 100%": { height: "30%" },
          "50%": { height: "100%" },
        },
        eq2: {
          "0%, 100%": { height: "100%" },
          "50%": { height: "35%" },
        },
        eq3: {
          "0%, 100%": { height: "55%" },
          "50%": { height: "85%" },
        },
      },
      animation: {
        "spin-slow": "spin 6s linear infinite",
        eq1: "eq1 0.9s ease-in-out infinite",
        eq2: "eq2 1.1s ease-in-out infinite",
        eq3: "eq3 0.7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

