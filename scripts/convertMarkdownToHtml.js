const fs = require("fs");
const { marked } = require("marked");

// Helper functions
function escapeQuotes(text) {
  return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function cleanHref(href) {
  return encodeURI(href).replace(/%25/g, "%");
}

let currTitle; // Title of the current file being processed
const renderer = new marked.Renderer(); // Custom renderer to add CSS classes and IDs

renderer.heading = ({ text, depth }) => {
  if (depth === 1) currTitle = text;
  return `<h${depth}>${text}</h${depth}>`;
};

// Ensure <ul> is not wrapped inside <p>
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
function convertMarkdownToStyledHtml(markdownPath, templatePath) {
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

    // Return the generated html
    return finalHtml;
  } catch (error) {
    console.error("Error generating styled HTML:", error.message);
  }
}

module.exports = { convertMarkdownToStyledHtml };
