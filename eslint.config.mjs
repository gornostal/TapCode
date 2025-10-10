import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import path from "node:path";

const tsConfigs = tseslint.configs["flat/recommended-type-checked"].map(
  (config) => {
    if (!config.languageOptions) {
      return {
        ...config,
        files: ["**/*.{ts,tsx}"],
      };
    }

    return {
      ...config,
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
        ...config.languageOptions,
        parserOptions: {
          ...config.languageOptions.parserOptions,
          project: path.resolve("./tsconfig.json"),
          tsconfigRootDir: path.resolve("."),
        },
      },
    };
  },
);

export default [
  js.configs.recommended,
  ...tsConfigs,
  {
    files: ["**/*.{ts,tsx,jsx,js}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    ignores: ["dist/"],
  },
];
