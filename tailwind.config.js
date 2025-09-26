/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Keep existing shadcn/ui colors for compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        // Extended custom gray scale
        gray: {
          0: "var(--color-gray-0)",
          50: "var(--color-gray-50)",
          75: "var(--color-gray-75)",
          100: "var(--color-gray-100)",
          150: "var(--color-gray-150)",
          200: "var(--color-gray-200)",
          250: "var(--color-gray-250)",
          300: "var(--color-gray-300)",
          350: "var(--color-gray-350)",
          400: "var(--color-gray-400)",
          450: "var(--color-gray-450)",
          500: "var(--color-gray-500)",
          550: "var(--color-gray-550)",
          600: "var(--color-gray-600)",
          650: "var(--color-gray-650)",
          700: "var(--color-gray-700)",
          740: "var(--color-gray-740)",
          750: "var(--color-gray-750)",
          800: "var(--color-gray-800)",
          850: "var(--color-gray-850)",
          870: "var(--color-gray-870)",
          885: "var(--color-gray-885)",
          900: "var(--color-gray-900)",
          950: "var(--color-gray-950)"
        },
        // Complete color palette
        rose: {
          100: "var(--color-rose-100)",
          200: "var(--color-rose-200)",
          300: "var(--color-rose-300)",
          400: "var(--color-rose-400)",
          500: "var(--color-rose-500)",
          600: "var(--color-rose-600)",
          700: "var(--color-rose-700)",
          800: "var(--color-rose-800)",
          900: "var(--color-rose-900)"
        },
        orange: {
          100: "var(--color-orange-100)",
          200: "var(--color-orange-200)",
          300: "var(--color-orange-300)",
          400: "var(--color-orange-400)",
          500: "var(--color-orange-500)",
          600: "var(--color-orange-600)",
          700: "var(--color-orange-700)",
          800: "var(--color-orange-800)",
          900: "var(--color-orange-900)"
        },
        purple: {
          100: "var(--color-purple-100)",
          200: "var(--color-purple-200)",
          300: "var(--color-purple-300)",
          400: "var(--color-purple-400)",
          500: "var(--color-purple-500)",
          600: "var(--color-purple-600)",
          700: "var(--color-purple-700)",
          800: "var(--color-purple-800)",
          900: "var(--color-purple-900)"
        },
        red: {
          100: "var(--color-red-100)",
          200: "var(--color-red-200)",
          300: "var(--color-red-300)",
          400: "var(--color-red-400)",
          500: "var(--color-red-500)",
          600: "var(--color-red-600)",
          700: "var(--color-red-700)",
          800: "var(--color-red-800)",
          900: "var(--color-red-900)"
        },
        blue: {
          100: "var(--color-blue-100)",
          200: "var(--color-blue-200)",
          300: "var(--color-blue-300)",
          400: "var(--color-blue-400)",
          500: "var(--color-blue-500)",
          600: "var(--color-blue-600)",
          700: "var(--color-blue-700)",
          800: "var(--color-blue-800)",
          900: "var(--color-blue-900)"
        },
        green: {
          100: "var(--color-green-100)",
          200: "var(--color-green-200)",
          300: "var(--color-green-300)",
          400: "var(--color-green-400)",
          500: "var(--color-green-500)",
          600: "var(--color-green-600)",
          700: "var(--color-green-700)",
          800: "var(--color-green-800)",
          900: "var(--color-green-900)"
        },
        yellow: {
          100: "var(--color-yellow-100)",
          200: "var(--color-yellow-200)",
          300: "var(--color-yellow-300)",
          400: "var(--color-yellow-400)",
          500: "var(--color-yellow-500)",
          600: "var(--color-yellow-600)",
          700: "var(--color-yellow-700)",
          800: "var(--color-yellow-800)",
          900: "var(--color-yellow-900)"
        },
        pink: {
          100: "var(--color-pink-100)",
          200: "var(--color-pink-200)",
          300: "var(--color-pink-300)",
          400: "var(--color-pink-400)",
          500: "var(--color-pink-500)",
          600: "var(--color-pink-600)",
          700: "var(--color-pink-700)",
          800: "var(--color-pink-800)",
          900: "var(--color-pink-900)"
        },
        fuchsia: {
          100: "var(--color-fuchsia-100)",
          200: "var(--color-fuchsia-200)",
          300: "var(--color-fuchsia-300)",
          400: "var(--color-fuchsia-400)",
          500: "var(--color-fuchsia-500)",
          600: "var(--color-fuchsia-600)",
          700: "var(--color-fuchsia-700)",
          800: "var(--color-fuchsia-800)",
          900: "var(--color-fuchsia-900)"
        },
        teal: {
          100: "var(--color-teal-100)",
          200: "var(--color-teal-200)",
          300: "var(--color-teal-300)",
          400: "var(--color-teal-400)",
          500: "var(--color-teal-500)",
          600: "var(--color-teal-600)",
          700: "var(--color-teal-700)",
          800: "var(--color-teal-800)",
          900: "var(--color-teal-900)"
        },
        cyan: {
          100: "var(--color-cyan-100)",
          200: "var(--color-cyan-200)",
          300: "var(--color-cyan-300)",
          400: "var(--color-cyan-400)",
          500: "var(--color-cyan-500)",
          600: "var(--color-cyan-600)",
          700: "var(--color-cyan-700)",
          800: "var(--color-cyan-800)",
          900: "var(--color-cyan-900)"
        },
        indigo: {
          100: "var(--color-indigo-100)",
          200: "var(--color-indigo-200)",
          300: "var(--color-indigo-300)",
          400: "var(--color-indigo-400)",
          500: "var(--color-indigo-500)",
          600: "var(--color-indigo-600)",
          700: "var(--color-indigo-700)",
          800: "var(--color-indigo-800)",
          900: "var(--color-indigo-900)"
        },
        violet: {
          100: "var(--color-violet-100)",
          200: "var(--color-violet-200)",
          300: "var(--color-violet-300)",
          400: "var(--color-violet-400)",
          500: "var(--color-violet-500)",
          600: "var(--color-violet-600)",
          700: "var(--color-violet-700)",
          800: "var(--color-violet-800)",
          900: "var(--color-violet-900)"
        },
        amber: {
          100: "var(--color-amber-100)",
          200: "var(--color-amber-200)",
          300: "var(--color-amber-300)",
          400: "var(--color-amber-400)",
          500: "var(--color-amber-500)",
          600: "var(--color-amber-600)",
          700: "var(--color-amber-700)",
          800: "var(--color-amber-800)",
          900: "var(--color-amber-900)"
        },
        lime: {
          100: "var(--color-lime-100)",
          200: "var(--color-lime-200)",
          300: "var(--color-lime-300)",
          400: "var(--color-lime-400)",
          500: "var(--color-lime-500)",
          600: "var(--color-lime-600)",
          700: "var(--color-lime-700)",
          800: "var(--color-lime-800)",
          900: "var(--color-lime-900)"
        }
      },
      fontFamily: {
        inter: ["var(--font-inter)"]
      },
      fontSize: {
        // Title sizes
        "title-h1": [
          "var(--text-title-h1)",
          {
            lineHeight: "var(--text-title-h1--line-height)",
            letterSpacing: "var(--text-title-h1--letter-spacing)",
            fontWeight: "var(--text-title-h1--font-weight)"
          }
        ],
        "title-h2": [
          "var(--text-title-h2)",
          {
            lineHeight: "var(--text-title-h2--line-height)",
            letterSpacing: "var(--text-title-h2--letter-spacing)",
            fontWeight: "var(--text-title-h2--font-weight)"
          }
        ],
        "title-h3": [
          "var(--text-title-h3)",
          {
            lineHeight: "var(--text-title-h3--line-height)",
            letterSpacing: "var(--text-title-h3--letter-spacing)",
            fontWeight: "var(--text-title-h3--font-weight)"
          }
        ],
        "title-h4": [
          "var(--text-title-h4)",
          {
            lineHeight: "var(--text-title-h4--line-height)",
            letterSpacing: "var(--text-title-h4--letter-spacing)",
            fontWeight: "var(--text-title-h4--font-weight)"
          }
        ],
        "title-h5": [
          "var(--text-title-h5)",
          {
            lineHeight: "var(--text-title-h5--line-height)",
            letterSpacing: "var(--text-title-h5--letter-spacing)",
            fontWeight: "var(--text-title-h5--font-weight)"
          }
        ],
        "title-h6": [
          "var(--text-title-h6)",
          {
            lineHeight: "var(--text-title-h6--line-height)",
            letterSpacing: "var(--text-title-h6--letter-spacing)",
            fontWeight: "var(--text-title-h6--font-weight)"
          }
        ],
        // Label sizes
        "label-xl": [
          "var(--text-label-xl)",
          {
            lineHeight: "var(--text-label-xl--line-height)",
            letterSpacing: "var(--text-label-xl--letter-spacing)",
            fontWeight: "var(--text-label-xl--font-weight)"
          }
        ],
        "label-lg": [
          "var(--text-label-lg)",
          {
            lineHeight: "var(--text-label-lg--line-height)",
            letterSpacing: "var(--text-label-lg--letter-spacing)",
            fontWeight: "var(--text-label-lg--font-weight)"
          }
        ],
        "label-md": [
          "var(--text-label-md)",
          {
            lineHeight: "var(--text-label-md--line-height)",
            letterSpacing: "var(--text-label-md--letter-spacing)",
            fontWeight: "var(--text-label-md--font-weight)"
          }
        ],
        "label-sm": [
          "var(--text-label-sm)",
          {
            lineHeight: "var(--text-label-sm--line-height)",
            letterSpacing: "var(--text-label-sm--letter-spacing)",
            fontWeight: "var(--text-label-sm--font-weight)"
          }
        ],
        "label-xs": [
          "var(--text-label-xs)",
          {
            lineHeight: "var(--text-label-xs--line-height)",
            letterSpacing: "var(--text-label-xs--letter-spacing)",
            fontWeight: "var(--text-label-xs--font-weight)"
          }
        ],
        // Paragraph sizes
        "paragraph-xl": [
          "var(--text-paragraph-xl)",
          {
            lineHeight: "var(--text-paragraph-xl--line-height)",
            letterSpacing: "var(--text-paragraph-xl--letter-spacing)",
            fontWeight: "var(--text-paragraph-xl--font-weight)"
          }
        ],
        "paragraph-lg": [
          "var(--text-paragraph-lg)",
          {
            lineHeight: "var(--text-paragraph-lg--line-height)",
            letterSpacing: "var(--text-paragraph-lg--letter-spacing)",
            fontWeight: "var(--text-paragraph-lg--font-weight)"
          }
        ],
        "paragraph-md": [
          "var(--text-paragraph-md)",
          {
            lineHeight: "var(--text-paragraph-md--line-height)",
            letterSpacing: "var(--text-paragraph-md--letter-spacing)",
            fontWeight: "var(--text-paragraph-md--font-weight)"
          }
        ],
        "paragraph-sm": [
          "var(--text-paragraph-sm)",
          {
            lineHeight: "var(--text-paragraph-sm--line-height)",
            letterSpacing: "var(--text-paragraph-sm--letter-spacing)",
            fontWeight: "var(--text-paragraph-sm--font-weight)"
          }
        ],
        "paragraph-xs": [
          "var(--text-paragraph-xs)",
          {
            lineHeight: "var(--text-paragraph-xs--line-height)",
            letterSpacing: "var(--text-paragraph-xs--letter-spacing)",
            fontWeight: "var(--text-paragraph-xs--font-weight)"
          }
        ],
        // Subheading sizes
        "subheading-md": [
          "var(--text-subheading-md)",
          {
            lineHeight: "var(--text-subheading-md--line-height)",
            letterSpacing: "var(--text-subheading-md--letter-spacing)",
            fontWeight: "var(--text-subheading-md--font-weight)"
          }
        ],
        "subheading-sm": [
          "var(--text-subheading-sm)",
          {
            lineHeight: "var(--text-subheading-sm--line-height)",
            letterSpacing: "var(--text-subheading-sm--letter-spacing)",
            fontWeight: "var(--text-subheading-sm--font-weight)"
          }
        ],
        "subheading-xs": [
          "var(--text-subheading-xs)",
          {
            lineHeight: "var(--text-subheading-xs--line-height)",
            letterSpacing: "var(--text-subheading-xs--letter-spacing)",
            fontWeight: "var(--text-subheading-xs--font-weight)"
          }
        ],
        "subheading-2xs": [
          "var(--text-subheading-2xs)",
          {
            lineHeight: "var(--text-subheading-2xs--line-height)",
            letterSpacing: "var(--text-subheading-2xs--letter-spacing)",
            fontWeight: "var(--text-subheading-2xs--font-weight)"
          }
        ]
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
        xl: `calc(var(--radius) + 4px)`
      },
      boxShadow: {
        di: "var(--shadow-di)"
      },
      animation: {
        shimmer: "shimmer 2s infinite"
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
