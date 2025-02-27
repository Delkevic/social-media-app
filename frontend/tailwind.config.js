module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        animation: {
          'slowMove': 'backgroundMove 30s linear infinite',
        },
        keyframes: {
          backgroundMove: {
            '0%': { transform: 'translateX(-50%) translateY(-50%) rotate(-45deg)' },
            '100%': { transform: 'translateX(0%) translateY(0%) rotate(-45deg)' },
          }
        },
        backgroundImage: {
          'gradient-45': 'linear-gradient(45deg, var(--tw-gradient-stops))',
        }
      },
    },
    plugins: [],
  }