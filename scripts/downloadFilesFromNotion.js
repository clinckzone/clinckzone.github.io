// Load environment variables from .env file
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const { convertMarkdownToStyledHtml } = require("./convertMarkdownToHtml.js");

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

// Write the markdown file to a html file
function exportMarkdownToHtml(markdownFilePath) {
  const templateFilePath = "../template.html";
  const htmlFilePath = markdownFilePath.replace(/\.md$/, ".html");
  const resolvedTemplateFilePath = path.resolve(__dirname, templateFilePath);

  try {
    const htmlString = convertMarkdownToStyledHtml(markdownFilePath, resolvedTemplateFilePath);
    fs.writeFileSync(htmlFilePath, htmlString, "utf-8");
  } catch (error) {
    console.error(`Error while generating html file ${htmlFilePath}:`, error.message);
  }
}

// Function to convert a Notion page to Markdown and save it
async function exportPageToMarkdown(page) {
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
    const sanitizedTitle = title
      .replace(/[<>:,"/\\|?*]+/g, "")
      .toLowerCase()
      .replace(/ /g, "-");
    const completefileName = `${pageCategory}-${sanitizedTitle}`;

    // Define the output path
    const outputDir = path.join(__dirname, `../${pageCategory}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Complete file path
    const mdFilePath = path.join(outputDir, `${completefileName}.md`);

    // Write the Markdown string to a file
    fs.writeFileSync(mdFilePath, mdString, "utf-8");
    console.log(`Exported: ${sanitizedTitle}.md`);

    exportMarkdownToHtml(mdFilePath);
  } catch (error) {
    console.error(`Error exporting page ${page.id}:`, error);
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
    if (isPageCompleted) await exportPageToMarkdown(page);
  }

  console.log("Export completed.");
}

// Execute the main function
main();
