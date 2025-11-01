import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";


export default [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      // Keep this minimal so ESLint can load reliably. Add project-specific rules/plugins later.
      // Example: project prefers TypeScript types over prop-types (disabled in source code where needed)
    }
  }
];