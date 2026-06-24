import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
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
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/integrations/supabase/client.server",
              message:
                "Server-only client. Import inside *.functions.ts or *.server.ts modules only — never from components/hooks.",
            },
          ],
          patterns: [
            {
              group: ["**/integrations/supabase/client.server*"],
              message: "Server-only Supabase client; do not import from client code.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
