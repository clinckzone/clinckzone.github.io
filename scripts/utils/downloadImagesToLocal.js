const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { pipeline } = require("stream");

const imageDirectory = path.resolve(__dirname, "../../images");
const streamPipeline = promisify(pipeline);

// Downloads an image using fetch() and saves it locally.
async function downloadImage(imageUrl, imageName) {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`❌ Failed to fetch image: ${response.statusText}`);
    }

    const imagePath = path.join(imageDirectory, imageName);
    const fileStream = fs.createWriteStream(imagePath);

    await streamPipeline(response.body, fileStream);
    console.log(`✅ Image downloaded: ${imagePath}`);
  } catch (error) {
    console.error(`❌ Failed to download image: ${imageUrl}`, error.message);
  }
}

module.exports = { downloadImage };
