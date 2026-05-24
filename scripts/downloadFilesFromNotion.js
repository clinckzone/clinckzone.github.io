// Load environment variables from .env file
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const { downloadImage } = require("./utils/downloadImagesToLocal.js");
const { formatIsoDateToDayMonthYear } = require("./utils/formatIsoDate.js");
const { exportMarkdownToHtml } = require("./utils/convertMarkdownToHtml.js");

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

function listPageOnWebsite(pageCategory, filename, metadata) {
  // Read the existing HTML
  const listingFilePath = path.resolve(__dirname, `../${pageCategory}.html`);
  const listingFileHtml = fs.readFileSync(listingFilePath, "utf-8");

  // Parse the HTML with JSDOM
  const dom = new JSDOM(listingFileHtml);
  const document = dom.window.document;

  // Find the .project-list element
  const projectList = document.querySelector(".project-list");

  // Create a new anchor element
  const newListItem = document.createElement("a");
  newListItem.setAttribute("href", `${pageCategory}/${filename}.html`);

  // Download cover file to local
  downloadImage(metadata.coverUrl, `${filename}-cover.png`);

  // Set the inner HTML of our new anchor
  newListItem.innerHTML = `
      <li class="card">
        <img src="images/${filename}-cover.png" />
        <h3>${metadata.title}</h3>
        ${metadata.tags.map((tag) => `<span>${tag}</span>`).join("")}
        <p>${metadata.subtitle}</p>
        <div class="date">${metadata.date}</div>
      </li>
  `;

  // Append it to the existing .project-list
  projectList.appendChild(newListItem);

  // Serialize the updated DOM back to HTML
  const updatedHTML = dom.serialize();

  // Write the updated HTML to the original file
  fs.writeFileSync(listingFilePath, updatedHTML, "utf-8");
  console.log(`Added ${pageCategory} listing to ${pageCategory}.html`);
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

// Function to create a new page in the website
async function addPageToWebsite(page) {
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

    // Skip if a card for this page already exists on the listing page.
    // Remove the card manually to force a re-publish.
    const listingFilePath = path.resolve(__dirname, `../${pageCategory}.html`);
    if (fs.existsSync(listingFilePath)) {
      const listingDom = new JSDOM(fs.readFileSync(listingFilePath, "utf-8"));
      const existingCard = listingDom.window.document.querySelector(
        `a[href="${pageCategory}/${completefileName}.html"]`,
      );
      if (existingCard) {
        console.log(`⏭️  Skipping ${completefileName}: already listed`);
        return;
      }
    }

    console.log(`Exporting page: ${title}`);
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
      coverUrl: page.cover.external.url,
      title,
      subtitle,
      tags: page.properties.Tags.multi_select.map((tag) => tag.name),
      date: formatIsoDateToDayMonthYear(dateIso),
    };

    // Create a listing from the page metadata
    listPageOnWebsite(pageCategory, completefileName, metadata);
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
      await addPageToWebsite(page);
    }
  }

  console.log("✅ Export completed.");
}

// Execute the main function
main();
