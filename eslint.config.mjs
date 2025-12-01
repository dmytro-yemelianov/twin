import js from "@eslint/js"
import globals from "globals"
import nextPlugin from "@next/eslint-plugin-next"
import tseslint from "typescript-eslint"

const tsConfigs = tseslint.configs.recommended

export default [
  {
    ignores: ["node_modules/**", ".next/**", "dist/**", "coverage/**"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  ...tsConfigs,
  nextPlugin.configs["core-web-vitals"],
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
]

