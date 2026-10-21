// Re-sorts the cards on blog.html and projects.html: newest dated posts
// first, then undated posts in their existing order.
// Usage: npm run sort-listings

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { sortListingCards } = require("./utils/sortListingCards.js");

for (const listing of ["blog", "projects"]) {
  const filePath = path.resolve(__dirname, `../${listing}.html`);
  const dom = new JSDOM(fs.readFileSync(filePath, "utf-8"));
  sortListingCards(dom.window.document);
  fs.writeFileSync(filePath, dom.serialize(), "utf-8");
  console.log(`Sorted ${listing}.html`);
}
