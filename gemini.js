const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required in .env file");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const TOKEN_LIMITS = {
  "gemini-3-pro": 1000000,
  "gemini-3-flash": 1000000,
  "gemini-2.5-pro": 1000000,
  "gemini-2.5-flash": 1000000,
  "gemini-2.5-flash-lite": 1000000,
  "gemini-2.0-flash": 1000000,
  "gemini-1.5-pro": 1000000,
  "gemini-1.5-flash": 1000000,
};

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function checkTokenLimit(prompt, imageBase64, modelName) {
  const tokenLimit = TOKEN_LIMITS[modelName] || 1000000;
  const promptTokens = estimateTokens(prompt);
  const imageSizeKB = Math.ceil(imageBase64.length / 1024);
  const imageTokens = imageSizeKB * 300;
  const totalTokens = promptTokens + imageTokens;
  
  if (totalTokens > tokenLimit) {
    const error = new Error(
      `Token limit exceeded. Estimated: ${totalTokens}, Limit: ${tokenLimit}`
    );
    error.code = "TOKEN_LIMIT_EXCEEDED";
    throw error;
  }
  
  return { promptTokens, imageTokens, totalTokens, limit: tokenLimit };
}

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
    const prompt = `You are an infrastructure auditor. Based on the image and user feedback, answer strictly in JSON format only.

Questions:
1. Is the infrastructure physically present? (true/false)
2. Is it usable for its intended public purpose? (true/false)
3. Give a brief evidence-based explanation.
4. Assign a usability score from 0 to 100.

Infrastructure Type: ${infraLabel}
User Feedback: ${comment}

Respond ONLY with valid JSON:
{
  "exists": true/false,
  "usable": true/false,
  "reason": "brief explanation",
  "usability_score": number
}`;

    const tokenInfo = checkTokenLimit(prompt, imageBase64, modelName);
    console.log(`Token: ${tokenInfo.totalTokens}/${tokenInfo.limit}`);

    const imageData = {
      inlineData: {
        data: imageBase64.split(",")[1] || imageBase64,
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imageData]);
    const text = await result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("No JSON in response");

    const analysis = JSON.parse(jsonMatch[0]);
    const ghostScore = 100 - analysis.usability_score;

    return {
      ...analysis,
      ghost_score: ghostScore,
      ghost_level:
        ghostScore >= 60 ? "InfraGhost" : ghostScore > 30 ? "Partial" : "Functional",
    };
  } catch (error) {
    console.error("Gemini error:", error.message);
    throw error;
  }
}

module.exports = { analyzeInfrastructure, checkTokenLimit, estimateTokens };
