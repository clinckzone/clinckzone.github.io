const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");

// What the Featured section on index.html shows, in order.
const FEATURED = [
  { listing: "projects", count: 2 },
  { listing: "blog", count: 1 },
];

function readDocument(file) {
  return new JSDOM(fs.readFileSync(path.join(root, file), "utf-8")).window
    .document;
}

function cardsOf(document) {
  const list = document.querySelector(".project-list");
  return list ? [...list.children].filter((el) => el.tagName === "A") : [];
}

// Compares cards ignoring whitespace, so a re-run with nothing new doesn't
// rewrite index.html.
function normalise(cards) {
  return cards.map((card) => card.outerHTML.replace(/\s+/g, " ")).join("");
}

// Sets the Featured section on index.html to the first two cards on
// projects.html and the first card on blog.html. Both listings live in the
// same folder as index.html, so the cards' links and images work unchanged.
// Returns true if index.html was updated.
function syncFeatured() {
  const featured = FEATURED.flatMap(({ listing, count }) =>
    cardsOf(readDocument(`${listing}.html`)).slice(0, count),
  );

  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "index.html"), "utf-8"),
  );
  const document = dom.window.document;
  const list = document.querySelector(".featured-projects .project-list");
  if (!list) {
    console.error("❌ No Featured section found on index.html");
    return false;
  }

  const current = [...list.children].filter((el) => el.tagName === "A");
  if (normalise(current) === normalise(featured)) {
    console.log("Featured section already up to date");
    return false;
  }

  list.replaceChildren(
    ...featured.map((card) => document.importNode(card, true)),
  );
  fs.writeFileSync(path.join(root, "index.html"), dom.serialize(), "utf-8");
  console.log("Updated Featured section on index.html");
  return true;
}

module.exports = { syncFeatured };
