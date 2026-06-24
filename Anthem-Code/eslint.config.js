import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Guard: components/pages must go through `@/features/*` or `@/core/*` —
  // only `src/server/*`, `src/core/*`, and `src/hooks/*` may import the supabase client directly.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/server/**",
      "src/core/**",
      "src/hooks/**",
      "src/integrations/**",
    ],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/integrations/supabase/client",
              message: "Do not import the supabase client directly. Use a hook from @/features/* or @/core/*, or add a query/mutation in @/server/*.",
            },
          ],
        },
      ],
    },
  },
);
