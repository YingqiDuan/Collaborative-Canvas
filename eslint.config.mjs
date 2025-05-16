import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import prettierPlugin from "eslint-plugin-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
      react: reactPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript recommended rules
      ...typescriptPlugin.configs["recommended"].rules,

      // React recommended rules
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed in Next.js

      // Prettier integration
      "prettier/prettier": "error",

      // Additional rules
      "no-unused-vars": "off", // Turned off in favor of typescript-eslint rule
      "@typescript-eslint/no-unused-vars": ["warn"],
      "@typescript-eslint/no-explicit-any": "warn", // Warn on any usage
      "@typescript-eslint/explicit-module-boundary-types": "off", // Too restrictive
      "@typescript-eslint/ban-ts-comment": "warn", // Warn on ts-ignore, etc.
    },
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
