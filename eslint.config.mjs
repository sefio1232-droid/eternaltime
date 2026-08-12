import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypeScript,
  {
    ignores: [
      ".next/**",
      ".tmp/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
