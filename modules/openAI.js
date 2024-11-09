const OpenAI = require("openai");
const openai = new OpenAI.Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openaiApi = new OpenAI.OpenAIApi(openai);

async function generateBookMark(prompt) {
  try {
    const response = await openaiApi.createImage({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });
    const image_url = response.data.data[0].url;
    console.log("Generated image URL:", image_url);
    return image_url;
  } catch (error) {
    console.error("Error generating image:", error);
  }
}
module.exports = {
  generateBookMark
};