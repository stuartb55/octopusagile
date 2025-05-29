import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginNext from "@next/eslint-plugin-next";

export default [
    js.configs.recommended,

    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            }
        }
    },

    ...tseslint.configs.recommended,

    pluginReact.configs.flat.recommended,
    pluginReact.configs.flat['jsx-runtime'],

    {
        plugins: {
            '@next/next': pluginNext
        },
        rules: {
            ...pluginNext.configs.recommended.rules,

        },
    },

    {
        files: ["**/*.{ts,tsx,mts,cts}"], // Scope these custom rules to TypeScript files
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
            "react/prop-types": "off"
        },
    }
];