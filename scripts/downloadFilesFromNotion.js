// Load environment variables from .env file
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const { downloadImage } = require("./utils/downloadImagesToLocal.js");
const { formatIsoDateToDayMonthYear } = require("./utils/formatIsoDate.js");
const { exportMarkdownToHtml } = require("./utils/convertMarkdownToHtml.js");
const { sortListingCards } = require("./utils/sortListingCards.js");
const { addImagePlaceholders } = require("./utils/addImagePlaceholders.js");
const { syncFeatured } = require("./utils/syncFeatured.js");
const {
  needsRebuild,
  loadListing,
  saveListing,
  findExistingCard,
  postPathFromCard,
  imagesUsedBy,
  removeUnusedImages,
  removeFile,
} = require("./utils/publishState.js");

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Initialize NotionToMarkdown converter
const n2m = new NotionToMarkdown({ notionClient: notion });

// Function to fetch pages from the database
async function getPages(databaseId) {
  const pages = [];
  let cursor = undefined;

  try {
    while (true) {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100,
      });

      pages.push(...response.results);

      if (!response.has_more) {
        break;
      }

      cursor = response.next_cursor;
    }
  } catch (error) {
    console.error("Error fetching pages:", error);
  }
  return pages;
}

async function updateImageUrlsInMarkdown(mdString, filename) {
  // Find all image urls
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  const matches = [...mdString.matchAll(imageRegex)];

  // Map original URLs to new local filenames
  const imageUrls = matches.map((match, index) => {
    const originalUrl = match[1]; // Captured URL
    const newFilename = `${filename}-${index + 1}.png`; // Ensure PNG format
    return { originalUrl, newFilename };
  });

  // Download images asynchronously
  console.log(`Downloading ${imageUrls.length} images in the page`);
  await Promise.all(
    imageUrls.map(({ originalUrl, newFilename }) =>
      downloadImage(originalUrl, newFilename),
    ),
  );

  // Replace Markdown content with new local paths
  let updatedMdString = mdString;
  imageUrls.forEach(({ originalUrl, newFilename }) => {
    const localPath = `../images/${newFilename}`; // Construct local reference
    updatedMdString = updatedMdString.replace(originalUrl, localPath);
  });

  return updatedMdString;
}

// Builds the listing card for a post.
function buildCard(document, pageId, postPath, filename, metadata) {
  const card = document.createElement("a");
  card.setAttribute("href", `${postPath}.html`);
  card.setAttribute("data-notion-id", pageId);

  const li = document.createElement("li");
  li.className = "card";

  const img = document.createElement("img");
  img.setAttribute("src", `images/${filename}-cover.png`);
  li.appendChild(img);

  const h3 = document.createElement("h3");
  h3.textContent = metadata.title;
  li.appendChild(h3);

  for (const tag of metadata.tags) {
    const span = document.createElement("span");
    span.textContent = tag;
    li.appendChild(span);
  }

  const p = document.createElement("p");
  p.textContent = metadata.subtitle;
  li.appendChild(p);

  const date = document.createElement("div");
  date.className = "date";
  date.textContent = metadata.date;
  li.appendChild(date);

  card.appendChild(li);
  return card;
}

// Publishes a Notion page, or updates it if it was already published and has
// been edited in Notion since its post was last committed.
async function publishPage(page) {
  try {
    // Get the page title
    let title = "Untitled";
    const titleProperty = page.properties.Name;
    if (
      titleProperty &&
      titleProperty.type === "title" &&
      titleProperty.title.length > 0
    ) {
      title = titleProperty.title.map((part) => part.plain_text).join("");
    }

    const pageCategory = page.properties.Category.select.name.toLowerCase();

    // Sanitize the title for filename
    const sanitizedFilename = title
      .replace(/[<>:,"/\\|?*]+/g, "")
      .replace(/ /g, "-")
      .toLowerCase();
    const completefileName = `${pageCategory}-${sanitizedFilename}`;
    const postPath = `${pageCategory}/${completefileName}`;

    // Cover can be either an external URL or a Notion-uploaded file (with a
    // short-lived signed URL). Either is fine since we download immediately.
    const coverUrl = page.cover?.external?.url ?? page.cover?.file?.url ?? null;
    if (!coverUrl) {
      console.error(`❌ No cover image set for ${completefileName}, skipping`);
      return;
    }

    // Is this page already on the site, possibly under an older title?
    const existing = findExistingCard(page.id, pageCategory, completefileName);
    let oldPostPath = null;
    let oldImages = new Set();

    if (existing) {
      oldPostPath = postPathFromCard(existing.card);

      // Cards published before page IDs were stored get theirs now
      if (!existing.card.hasAttribute("data-notion-id")) {
        existing.card.setAttribute("data-notion-id", page.id);
        saveListing(existing.listing);
      }

      const moved = oldPostPath !== postPath;
      if (!moved && !needsRebuild(page.last_edited_time, `${postPath}.md`)) {
        console.log(`⏭️  Unchanged: ${completefileName}`);
        return;
      }

      oldImages = imagesUsedBy(
        `${oldPostPath}.md`,
        existing.card.querySelector("img")?.getAttribute("src"),
      );
      console.log(
        moved
          ? `🔄 Updating ${oldPostPath} -> ${postPath}`
          : `🔄 Updating ${postPath}`,
      );
    } else {
      console.log(`🆕 Publishing ${postPath}`);
    }

    const mdBlocks = await n2m.pageToMarkdown(page.id);
    const mdString = n2m.toMarkdownString(mdBlocks).parent;

    // Downloads and replaces all the remote image urls with local ones
    const updatedMdString = await updateImageUrlsInMarkdown(
      mdString,
      completefileName,
    );

    // Define the output path
    const outputDir = path.resolve(__dirname, `../${pageCategory}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Complete file path
    const mdFilePath = path.resolve(outputDir, `${completefileName}.md`);

    // Write the Markdown string to a file
    fs.writeFileSync(mdFilePath, updatedMdString, "utf-8");
    console.log(`✅ Exported: ${completefileName}.md`);

    // Write the markdown to a HTML file
    exportMarkdownToHtml(mdFilePath);
    console.log(`✅ Exported: ${completefileName}.html`);

    // Description is a rich_text property; safe-read for pages without it set.
    const subtitle =
      page.properties.Description?.rich_text
        ?.map((part) => part.plain_text)
        .join("") ?? "";

    // Prefer the manual Date property; fall back to the auto Created timestamp.
    const dateIso =
      page.properties.Date?.date?.start ?? page.properties.Created.created_time;

    // Page metadata
    const metadata = {
      title,
      subtitle,
      tags: page.properties.Tags.multi_select.map((tag) => tag.name),
      date: formatIsoDateToDayMonthYear(dateIso),
    };

    // Download cover file to local
    await downloadImage(coverUrl, `${completefileName}-cover.png`);

    // Put the card on the listing: replace the old card in place, or move it
    // to the right listing if the category changed.
    const sameListing = existing?.listing.category === pageCategory;
    const listing = sameListing ? existing.listing : loadListing(pageCategory);
    const newCard = buildCard(
      listing.document,
      page.id,
      postPath,
      completefileName,
      metadata,
    );

    if (sameListing) {
      existing.card.replaceWith(newCard);
    } else {
      if (existing) {
        existing.card.remove();
        saveListing(existing.listing);
      }
      listing.document.querySelector(".project-list").appendChild(newCard);
    }

    // Newest dated posts first, then undated posts in their existing order
    sortListingCards(listing.document);

    // Reserve space for each cover and show a placeholder while it loads
    addImagePlaceholders(listing.document, path.resolve(__dirname, ".."));

    saveListing(listing);
    console.log(`✅ Listed on ${pageCategory}.html`);

    // Clean up after a rename or category change, and drop images the
    // post no longer uses
    if (oldPostPath && oldPostPath !== postPath) {
      removeFile(`${oldPostPath}.md`);
      removeFile(`${oldPostPath}.html`);
    }
    removeUnusedImages(
      oldImages,
      imagesUsedBy(`${postPath}.md`, `images/${completefileName}-cover.png`),
    );
  } catch (error) {
    console.error(`❌ Error exporting page ${page.id}:`, error);
  }
}

// Main function
async function main() {
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    console.error("Please set NOTION_DATABASE_ID in your .env file.");
    return;
  }

  console.log("Fetching pages from Notion database...");

  const pages = await getPages(databaseId);
  console.log(`Found ${pages.length} pages.`);

  for (const page of pages) {
    if (page.properties.Status?.select?.name === "Complete") {
      await publishPage(page);
    }
  }

  // Featured on the home page = first two projects + first blog post
  syncFeatured();

  console.log("✅ Export completed.");
}

// Execute the main function
main();
