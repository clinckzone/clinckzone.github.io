const fs = require("fs");
const { JSDOM } = require("jsdom");
const TurndownService = require("turndown");

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

// Convert HTML to Markdown and save in place.
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

    // Return the generated markdown
    return markdownContent;
  } catch (error) {
    throw error;
  }
};

module.exports = { convertHtmlToMarkdown };
