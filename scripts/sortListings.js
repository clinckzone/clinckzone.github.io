// Re-sorts the cards on blog.html and projects.html: newest dated posts
// first, then undated posts in their existing order. Then syncs the
// Featured section on index.html.
// Usage: npm run sort-listings

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { sortListingCards } = require("./utils/sortListingCards.js");
const { syncFeatured } = require("./utils/syncFeatured.js");

for (const listing of ["blog", "projects"]) {
  const filePath = path.resolve(__dirname, `../${listing}.html`);
  const dom = new JSDOM(fs.readFileSync(filePath, "utf-8"));
  sortListingCards(dom.window.document);
  fs.writeFileSync(filePath, dom.serialize(), "utf-8");
  console.log(`Sorted ${listing}.html`);
}

// Featured on the home page = first two projects + first blog post
syncFeatured();
