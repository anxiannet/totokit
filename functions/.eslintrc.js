module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": "off", // Disable quotes style checking
    "import/no-unresolved": 0,
    "indent": "off", // Disable indentation checking
    "max-len": "off", // Disable line length checking
    "object-curly-spacing": "off", // Disable spacing in object literals
    "eol-last": "off", // Disable newline at end of file checking
    "arrow-parens": "off", // Disable parentheses around arrow function arguments
    // You can add more rules to "off" here if other formatting checks appear
  },
};
