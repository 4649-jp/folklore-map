const path = require("path");

const dummyFontPath = path.join(__dirname, ".fonts", "dummy.woff2");

const buildCss = (family, weights) =>
  weights
    .map(
      (weight) => `
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('${dummyFontPath}') format('woff2');
}`
    )
    .join("\n");

module.exports = {
  "https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;600;700&display=swap":
    buildCss("Noto Serif JP", [400, 500, 600, 700]),
  "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap":
    buildCss("Zen Kaku Gothic New", [400, 500, 700]),
};
