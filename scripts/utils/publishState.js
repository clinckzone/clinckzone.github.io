const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const imagesDir = path.join(root, "images");

const LISTINGS = ["blog", "projects"];

// Notion reports last-edited times rounded down to the minute, so an edit
// made in the same minute as the last commit could look older than it is.
// Treat anything within a minute of the commit as possibly newer.
const NOTION_TIME_SLACK_MS = 60 * 1000;

// When this file was last committed, or null if it never was.
// Needs the full git history (fetch-depth: 0 in the workflow); in a shallow
// clone every file looks like it was committed in the latest commit.
function lastCommitTime(relativePath) {
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", relativePath],
      { cwd: root, encoding: "utf-8" },
    ).trim();
    return out ? Date.parse(out) : null;
  } catch {
    return null;
  }
}

// A published post needs rebuilding when its Notion page was edited after
// its Markdown file was last committed.
function needsRebuild(lastEditedIso, mdRelativePath) {
  if (!fs.existsSync(path.join(root, mdRelativePath))) return true;

  const committed = lastCommitTime(mdRelativePath);
  if (committed === null) return true;

  return Date.parse(lastEditedIso) > committed - NOTION_TIME_SLACK_MS;
}

function loadListing(category) {
  const file = path.join(root, `${category}.html`);
  if (!fs.existsSync(file)) return null;
  const dom = new JSDOM(fs.readFileSync(file, "utf-8"));
  return { category, file, dom, document: dom.window.document };
}

function saveListing(listing) {
  fs.writeFileSync(listing.file, listing.dom.serialize(), "utf-8");
}

// Finds the card already published for this Notion page: first by its page
// ID (works after renames and category changes), then by the URL the page
// would have now (cards published before IDs were stored).
function findExistingCard(pageId, category, filename) {
  for (const name of LISTINGS) {
    const listing = loadListing(name);
    const card = listing?.document.querySelector(
      `.project-list > a[data-notion-id="${pageId}"]`,
    );
    if (card) return { listing, card };
  }

  const listing = loadListing(category);
  const card = listing?.document.querySelector(
    `.project-list > a[href="${category}/${filename}.html"]`,
  );
  return card ? { listing, card } : null;
}

// "projects/projects-coodle.html" -> "projects/projects-coodle"
function postPathFromCard(card) {
  return card.getAttribute("href").replace(/\.html$/, "");
}

// Image filenames a post uses: those in its Markdown plus its card cover.
function imagesUsedBy(mdRelativePath, coverSrc) {
  const names = new Set();

  const mdFile = path.join(root, mdRelativePath);
  if (fs.existsSync(mdFile)) {
    const md = fs.readFileSync(mdFile, "utf-8");
    for (const match of md.matchAll(/\.\.\/images\/([^)\s"']+)/g)) {
      names.add(decodeURI(match[1]));
    }
  }

  if (coverSrc?.startsWith("images/")) {
    names.add(decodeURI(coverSrc.slice("images/".length)));
  }

  return names;
}

// Deletes images an old version of a post used that the new version doesn't.
function removeUnusedImages(oldNames, newNames) {
  for (const name of oldNames) {
    if (newNames.has(name)) continue;
    const file = path.join(imagesDir, name);
    if (path.dirname(file) !== imagesDir || !fs.existsSync(file)) continue;
    fs.unlinkSync(file);
    console.log(`🗑️  Removed unused image ${name}`);
  }
}

function removeFile(relativePath) {
  const file = path.join(root, relativePath);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`🗑️  Removed ${relativePath}`);
  }
}

module.exports = {
  LISTINGS,
  needsRebuild,
  loadListing,
  saveListing,
  findExistingCard,
  postPathFromCard,
  imagesUsedBy,
  removeUnusedImages,
  removeFile,
};
