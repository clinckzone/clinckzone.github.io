const fs = require("fs");
const path = require("path");
const sizeOf = require("image-size");

// Post images are capped at this height by css/page.css.
const POST_IMAGE_MAX_HEIGHT = 400;

// Images narrower than this ratio are shown full width (see js/resizeImage.js).
const TALL_IMAGE_RATIO = 0.65;

const PLACEHOLDER_CLASS = "img-ph";

function readSize(img, htmlDir) {
  const src = img.getAttribute("src");
  if (!src || /^(https?:)?\/\//.test(src) || src.startsWith("data:")) {
    return null;
  }

  const filePath = path.resolve(htmlDir, decodeURI(src));
  if (!fs.existsSync(filePath)) return null;

  try {
    const { width, height } = sizeOf(filePath);
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}

// Gives each card cover and post image its real width/height and a loading
// placeholder, so the browser reserves the right space before the image
// arrives and nothing jumps when it does.
//
// `htmlDir` is the folder of the HTML file, used to resolve relative srcs.
function addImagePlaceholders(document, htmlDir) {
  const images = document.querySelectorAll(
    ".project-list .card img, .page .image img",
  );

  for (const img of images) {
    const size = readSize(img, htmlDir);
    if (!size) continue;

    const { width, height } = size;
    img.setAttribute("width", String(width));
    img.setAttribute("height", String(height));
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    img.classList.add(PLACEHOLDER_CLASS);

    // Card covers are sized by CSS (width: 100%, height: auto), so the
    // attributes above are enough. Post images are shrink-to-fit, so set the
    // exact size they end up at once loaded.
    if (img.closest(".page .image")) {
      const ratio = width / height;
      const style =
        ratio < TALL_IMAGE_RATIO
          ? "width: 100%; height: auto; max-height: none;"
          : `width: ${Math.round(Math.min(width, POST_IMAGE_MAX_HEIGHT * ratio))}px; height: auto;`;
      img.setAttribute("style", `${style} aspect-ratio: ${width} / ${height};`);
    }
  }
}

// Adds the script that clears the placeholder once each image has loaded.
function addPlaceholderScript(document, scriptSrc) {
  if (document.querySelector(`script[src="${scriptSrc}"]`)) return;

  const script = document.createElement("script");
  script.setAttribute("src", scriptSrc);
  script.setAttribute("defer", "");
  document.head.appendChild(script);
}

module.exports = { addImagePlaceholders, addPlaceholderScript };
