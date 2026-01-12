const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required in .env file. Get your free key from https://ai.google.dev/");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

async function analyzeInfrastructure(imageBase64, infraType, comment) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });

    const infraTypeMap = {
      water: "Drinking Water",
      toilet: "Toilet",
      streetlight: "Streetlight",
      ramp: "Ramp",
    };

    const infraLabel = infraTypeMap[infraType] || infraType;

    const prompt = `You are an infrastructure auditor.

Based on the image and user feedback, answer strictly in JSON format only.

Questions:
1. Is the infrastructure physically present? (true/false)
2. Is it usable for its intended public purpose? (true/false)
3. Give a brief evidence-based explanation.
4. Assign a usability score from 0 to 100.

Infrastructure Type: ${infraLabel}
User Feedback: ${comment}

Respond ONLY with valid JSON in this exact format, no other text:
{
  "exists": true/false,
  "usable": true/false,
  "reason": "brief explanation",
  "usability_score": number
}`;

    const imageData = {
      inlineData: {
        data: imageBase64.split(",")[1] || imageBase64,
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Gemini response");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    const ghostScore = 100 - analysis.usability_score;

    return {
      ...analysis,
      ghost_score: ghostScore,
      ghost_level:
        ghostScore >= 60 ? "InfraGhost" : ghostScore > 30 ? "Partial" : "Functional",
    };
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    throw error;
  }
}

module.exports = { analyzeInfrastructure };
