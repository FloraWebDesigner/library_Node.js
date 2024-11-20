
// Node.js code example for downloading an image
// For more details, visit: https://github.com/pollinations/pollinations/blob/master/APIDOCS.md
const fs =require('fs');
const fetch=require('node-fetch');


async function downloadImage(imageUrl) {
  // Fetching the image from the URL
  const response = await fetch(imageUrl);
  // Reading the response as a buffer
  const buffer = await response.buffer();
  // Writing the buffer to a file named 'image.png'
  fs.writeFileSync('image.png', buffer);
  // Logging completion message
  console.log('Download Completed');
}

// Image details
// const prompt = 'today is a good day';
const width = 188;
const height = 566;
const seed = 854825; // Each seed generates a new image variation
const model = 'flux'; // Using 'flux' as default if model is not provided

async function getImage(prompt) {
   const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}`; 
   return imageUrl;
}


module.exports={
    getImage,
    downloadImage
}
