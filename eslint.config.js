const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: globals.node,
      sourceType: "commonjs",
    },
  },
  {
    files: ["js/**/*.js"],
    languageOptions: {
      globals: { ...globals.browser, MathJax: "writable" },
      sourceType: "script",
    },
  },
  {
    ignores: ["node_modules/**", "images/**", "files/**", ".husky/**"],
  },
];
