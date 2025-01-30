const fs = require("fs");
const path = require("path");
const TurndownService = require("turndown");
const { JSDOM } = require("jsdom");

// Initialize Turndown service
const turndownService = new TurndownService();

// Add a custom rule to handle <ul class="double/single"> with images
turndownService.addRule("imageHandler", {
  filter: (node) => {
    return (
      node.nodeName === "UL" &&
      (node.classList.contains("double") || node.classList.contains("single"))
    );
  },
  replacement: (content, node, options) => {
    let media = [];

    // Process each <li class="image">
    node.querySelectorAll("li.image").forEach((li) => {
      const img = li.querySelector("img");
      const caption = li.querySelector("span")?.textContent.trim() || "";

      if (img) {
        media.push(`![${caption}](${img.getAttribute("src")})`);
      }
    });

    node.querySelectorAll("li.video").forEach((li) => {
      const iframe = li.querySelector("iframe");
      const caption = li.querySelector("span")?.textContent.trim() || "";

      if (iframe) {
        media.push(`[${caption}](${iframe.getAttribute("src")})`);
      }
    });

    return media.join("\n");
  },
});

/**
 * Convert HTML to Markdown and save in place.
 * @param {string} htmlFilePath - Path to the HTML file
 */
const convertHtmlToMarkdown = (htmlFilePath) => {
  try {
    // Read the HTML file
    const htmlContent = fs.readFileSync(htmlFilePath, "utf-8");

    // Parse the HTML with JSDOM and extract page content
    const dom = new JSDOM(htmlContent);
    const pageDiv = dom.window.document.querySelector("div.page");

    if (!pageDiv) {
      console.log(`No <div class="page"></div> found in: ${htmlFilePath}`);
      return;
    }

    // Extract inner HTML of the <div class="page"></div>
    const pageHtml = pageDiv.innerHTML;

    // Convert HTML to Markdown
    const markdownContent = turndownService.turndown(pageHtml);

    // Replace file extension with .md
    const markdownFilePath = htmlFilePath.replace(/\.html$/, ".md");

    // Write the Markdown file
    fs.writeFileSync(markdownFilePath, markdownContent, "utf-8");
    console.log(`Converted: ${htmlFilePath} -> ${markdownFilePath}`);
  } catch (error) {
    console.error(`Error converting file ${htmlFilePath}:`, error.message);
  }
};

/**
 * Main function to process all .html files in a directory recursively.
 * @param {string} startDir - Starting directory
 */
const processHtmlFiles = (startDir) => {
  console.log(`Searching for .html files in: ${startDir}`);

  const htmlFiles = findHtmlFiles(startDir);

  if (htmlFiles.length === 0) {
    console.log("No .html files found.");
    return;
  }

  console.log(`Found ${htmlFiles.length} .html file(s). Converting...`);

  htmlFiles.forEach((htmlFile) => {
    convertHtmlToMarkdown(htmlFile);
  });

  console.log("Conversion complete.");
};

/**
 * Recursively traverse a directory to find all .html files.
 * @param {string} dir - Directory to traverse
 * @returns {string[]} - List of paths to .html files
 */
const findHtmlFiles = (dir) => {
  let results = [];
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively process subdirectory
      results = results.concat(findHtmlFiles(filePath));
    } else if (path.extname(file) === ".html") {
      // Add HTML file to results
      results.push(filePath);
    }
  });

  return results;
};

// Get starting directory from command-line argument
const startDirectory = process.argv[2];

if (!startDirectory) {
  console.error("Error: Please provide a starting directory as a command-line argument.");
  console.log("Usage: node convertHtmlToMarkdown.js <starting-directory>");
  process.exit(1);
}

// Resolve the provided directory path
const resolvedDirectory = path.resolve(__dirname, startDirectory);
processHtmlFiles(resolvedDirectory);
