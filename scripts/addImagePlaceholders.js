// Adds image sizes and loading placeholders to pages that already exist:
// the home page, both listings and every generated post. New pages get
// these automatically when they are published.
// Usage: npm run add-image-placeholders

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const {
  addImagePlaceholders,
  addPlaceholderScript,
} = require("./utils/addImagePlaceholders.js");

const root = path.resolve(__dirname, "..");

const pages = [
  ...["index.html", "blog.html", "projects.html"].map((file) => ({
    file: path.join(root, file),
    scriptSrc: "js/imagePlaceholder.js",
  })),
  ...["blog", "projects"].flatMap((dir) =>
    fs
      .readdirSync(path.join(root, dir))
      .filter((file) => file.endsWith(".html"))
      .map((file) => ({
        file: path.join(root, dir, file),
        scriptSrc: "../js/imagePlaceholder.js",
      })),
  ),
];

for (const { file, scriptSrc } of pages) {
  const dom = new JSDOM(fs.readFileSync(file, "utf-8"));
  const document = dom.window.document;
  addImagePlaceholders(document, path.dirname(file));
  addPlaceholderScript(document, scriptSrc);
  fs.writeFileSync(file, dom.serialize(), "utf-8");
  console.log(`Updated ${path.relative(root, file)}`);
}
