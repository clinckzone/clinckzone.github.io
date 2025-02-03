// Load environment variables from .env file
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
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

  // Set the inner HTML of our new anchor
  newListItem.innerHTML = `
      <li class="card">
        <img src=${metadata.coverUrl} />
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

// Function to create a new page in the website
async function addPageToWebsite(page) {
  try {
    const mdBlocks = await n2m.pageToMarkdown(page.id);
    const mdString = n2m.toMarkdownString(mdBlocks).parent;
    const pageCategory = page.properties.Category.select.name.toLowerCase();

    // Get the page title
    const titleProperty = page.properties.Name;
    let title = "Untitled";
    if (titleProperty && titleProperty.type === "title" && titleProperty.title.length > 0) {
      title = titleProperty.title.map((part) => part.plain_text).join("");
    }

    // Sanitize the title for filename
    const sanitizedFilename = title
      .replace(/[<>:,"/\\|?*]+/g, "")
      .replace(/ /g, "-")
      .toLowerCase();
    const completefileName = `${pageCategory}-${sanitizedFilename}`;

    // Define the output path
    const outputDir = path.resolve(__dirname, `../${pageCategory}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Complete file path
    const mdFilePath = path.resolve(outputDir, `${completefileName}.md`);

    // Write the Markdown string to a file
    fs.writeFileSync(mdFilePath, mdString, "utf-8");
    console.log(`✅ Exported: ${completefileName}.md`);

    // Write the markdown to a HTML file
    exportMarkdownToHtml(mdFilePath);
    console.log(`✅ Exported: ${completefileName}.html`);

    // Page metadata
    const metadata = {
      coverUrl: page.cover.external.url,
      title,
      subtitle: "",
      tags: page.properties.Tags.multi_select.map((tag) => tag.name),
      date: formatIsoDateToDayMonthYear(page.properties.Created.created_time),
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
    isPageCompleted = page.properties.Status.select.name === "Complete";
    if (isPageCompleted) await addPageToWebsite(page);
  }

  console.log("✅ Export completed.");
}

// Execute the main function
main();
