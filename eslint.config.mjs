import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
    js.configs.recommended,

    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        languageOptions: {
            globals: {
                ...globals.browser,
            }
        }
    },

    ...tseslint.configs.recommended,

    pluginReact.configs.flat.recommended, // This enables React-specific rules, including react/prop-types

    {
        files: ["**/*.{ts,tsx,mts,cts}"],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                },
            ],
            // Add this line to disable the react/prop-types rule for TypeScript files
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off" // Not needed with React 17+ and newer versions of Next.js
        },
    }
];