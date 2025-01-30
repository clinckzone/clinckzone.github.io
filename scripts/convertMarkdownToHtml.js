const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

// Title of the current file being processed
let currTitle;

// Helper function to escape quotes
const escapeQuotes = (text) => text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const cleanHref = (href) => encodeURI(href).replace(/%25/g, "%");

// Custom renderer to add CSS classes and IDs
const renderer = new marked.Renderer();

renderer.heading = ({ text, depth }) => {
  if (depth === 1) currTitle = text;
  return `<h${depth}>${text}</h${depth}>`;
};

// Ensure <ul> is not wrapped inside <p>
// It's invalid HTML
renderer.paragraph = ({ tokens }) => {
  // If the text starts with a <ul>, return it without wrapping in <p>
  const text = renderer.parser.parseInline(tokens);
  if (text.startsWith("<ul")) {
    return text;
  }
  return `<p>${renderer.parser.parseInline(tokens)}</p>\n`;
};

renderer.image = ({ href, title, text }) => {
  href = cleanHref(href);
  text = escapeQuotes(text);
  return `<ul class="single"><li class="image"><img src="${href}" alt="${text}" /><span>${text}</span></li></ul>`;
};

renderer.hr = () => {
  return `<hr class="line"/>`;
};

renderer.link = ({ href, tokens }) => {
  href = cleanHref(href);
  const text = escapeQuotes(renderer.parser.parseInline(tokens));
  if (href.includes("youtube.com") || href.includes("youtu.be")) {
    return `
      <ul class="single">
        <li class="video" style="width: 70%">
          <iframe 
            width="560" 
            height="315" 
            src="${href}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            ></iframe>
            <span>${text}</span>
        </li>
      </ul>
    `.trim();
  } else {
    return `<a href="${href}" target="_blank">${text}</a>`;
  }
};

marked.setOptions({ renderer });

// Function to convert Markdown to styled HTML
const convertMarkdownToStyledHtml = (markdownPath, templatePath) => {
  try {
    // Read the Markdown file
    const markdownContent = fs.readFileSync(markdownPath, "utf-8");

    // Convert Markdown to styled HTML
    const contentHtml = marked(markdownContent);

    // Read the HTML template
    const templateHtml = fs.readFileSync(templatePath, "utf-8");

    // Inject the converted HTML into the template
    const finalHtml = templateHtml
      .replace('<div class="page"></div>', `<div class="page">${contentHtml}</div>`)
      .replace("<title>Template</title>", `<title>${currTitle}</title>`);

    // Write the final HTML to the output file
    const htmlFilePath = markdownPath.replace(/\.md$/, ".html");
    fs.writeFileSync(htmlFilePath, finalHtml, "utf-8");

    console.log("Styled HTML file generated successfully at:", htmlFilePath);
  } catch (error) {
    console.error("Error generating styled HTML:", error.message);
  }
};

/**
 * Main function to process all .md files in a directory recursively.
 * @param {string} startDir - Starting directory
 * @param {string} templateFilePath - Template file
 */
const processMarkdownFiles = (startDir, templateFilePath) => {
  console.log(`Searching for .md files in: ${startDir}`);

  const mdFiles = findMdFiles(startDir);

  if (mdFiles.length === 0) {
    console.log("No .md files found.");
    return;
  }

  console.log(`Found ${mdFiles.length} .md file(s). Converting...`);

  mdFiles.forEach((mdFile) => {
    convertMarkdownToStyledHtml(mdFile, templateFilePath);
  });

  console.log("Conversion complete.");
};

/**
 * Recursively traverse a directory to find all .md files.
 * @param {string} dir - Directory to traverse
 * @returns {string[]} - List of paths to .md files
 */
const findMdFiles = (dir) => {
  let results = [];
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively process subdirectory
      results = results.concat(findMdFiles(filePath));
    } else if (path.extname(file) === ".md") {
      // Add .md file to results
      results.push(filePath);
    }
  });

  return results;
};

// Get starting directory and tempalteFile from command-line argument
const startDirectory = process.argv[2];
const templateFilePath = process.argv[3];

if (!(startDirectory && templateFilePath)) {
  console.error(
    "Error: Please provide a starting directory and html tempalte file paths as command-line argument."
  );
  console.log("Usage: node convertMarkdownToHtml.js <starting-directory> <template-file-path>");
  process.exit(1);
}

// Resolve the provided directory and HTML template paths
const resolvedDirectory = path.resolve(__dirname, startDirectory);
const resolvedTemplateFilePath = path.resolve(__dirname, templateFilePath);
processMarkdownFiles(resolvedDirectory, resolvedTemplateFilePath);
