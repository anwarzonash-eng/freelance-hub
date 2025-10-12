import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      // Turn off consistent type assertion warnings
      "@typescript-eslint/consistent-type-assertions": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-duplicate-enum-values": "off",
      "react/no-unescaped-entities": "off",
      // Optional: allow explicit 'any'
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

];

export default eslintConfig;
