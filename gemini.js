const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required in .env file. Get your free key from https://ai.google.dev/");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Token limits for different Gemini models (input tokens)
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

// Approximate token estimation: 1 token ≈ 4 characters
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Check if total tokens exceed limit
function checkTokenLimit(prompt, imageBase64, modelName) {
  const tokenLimit = TOKEN_LIMITS[modelName] || 1000000;
  
  // Estimate prompt tokens
  const promptTokens = estimateTokens(prompt);
  
  // Estimate image tokens (rough estimate: base64 image typically uses 200-400 tokens per 1KB)
  const imageSizeKB = Math.ceil(imageBase64.length / 1024);
  const imageTokens = imageSizeKB * 300; // Conservative estimate
  
  const totalTokens = promptTokens + imageTokens;
  
  if (totalTokens > tokenLimit) {
    const error = new Error(
      `Token limit exceeded. Estimated tokens: ${totalTokens}, Limit: ${tokenLimit}. ` +
      `Prompt tokens: ${promptTokens}, Image tokens: ${imageTokens}`
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

    // Check token limit before making API call
    const tokenInfo = checkTokenLimit(prompt, imageBase64, modelName);
    console.log(`Token usage: ${tokenInfo.totalTokens}/${tokenInfo.limit} tokens`);

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

    const finalResult = {
      ...analysis,
      ghost_score: ghostScore,
      ghost_level:
        ghostScore >= 60 ? "InfraGhost" : ghostScore > 30 ? "Partial" : "Functional",
    };

    // Print Gemini output to console
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("📊 GEMINI ANALYSIS RESULT");
    console.log("═══════════════════════════════════════════════════════");
    console.log("Infrastructure Present:", finalResult.exists ? "✓ YES" : "✗ NO");
    console.log("Usable:", finalResult.usable ? "✓ YES" : "✗ NO");
    console.log("Reason:", finalResult.reason);
    console.log("Usability Score:", finalResult.usability_score + "/100");
    console.log("Ghost Score:", finalResult.ghost_score + "/100");
    console.log("Ghost Level:", finalResult.ghost_level);
    console.log("═══════════════════════════════════════════════════════\n");

    return finalResult;
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    throw error;
  }
}

module.exports = { analyzeInfrastructure, checkTokenLimit, estimateTokens };
