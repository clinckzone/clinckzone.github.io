const fs = require("fs");
const path = require("path");

const { exportHtmlToMarkdown } = require("./utils/convertHtmlToMarkdown");
const { exportMarkdownToHtml } = require("./utils/convertMarkdownToHtml");

// Recursively processes all files in a directory and converts them based on the format.
function bulkConvertFiles(dirPath, targetFormat) {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ Directory not found: ${dirPath}`);
    return;
  }
  if (targetFormat !== "md" && targetFormat !== "html") {
    console.error(`❌ Invalid format: ${targetFormat}. Use 'md' or 'html'.`);
    return;
  }

  function processDirectory(directory) {
    const files = fs.readdirSync(directory);

    files.forEach((file) => {
      const fullPath = path.resolve(directory, file);
      const stats = fs.statSync(fullPath);

      // Recursively search for valid files for conversion
      if (stats.isDirectory()) {
        processDirectory(fullPath);
      }
      // Converts an individual file between Markdown and HTML.
      else {
        if (targetFormat === "md" && fullPath.endsWith(".html")) {
          exportHtmlToMarkdown(fullPath);
        } else if (targetFormat === "html" && fullPath.endsWith(".md")) {
          exportMarkdownToHtml(fullPath);
        }
      }
    });
  }

  processDirectory(dirPath);
  console.log(
    `✅ Bulk conversion completed: ${targetFormat.toUpperCase()} files saved in ${dirPath}`
  );
}

// Get arguments from command-line
const startDirectory = process.argv[2];
const targetFormat = process.argv[3];

// Validate inputs
if (!startDirectory || !targetFormat) {
  console.error("❌ Usage: node script.js <directory> <md|html>");
  process.exit(1);
}

// Resolve absolute path for robustness
const resolvedStartDirectory = path.resolve(__dirname, startDirectory);

bulkConvertFiles(resolvedStartDirectory, targetFormat);
