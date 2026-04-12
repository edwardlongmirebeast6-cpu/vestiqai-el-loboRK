const OpenAI = require("openai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { budget, risk, goal, accessMode } = JSON.parse(event.body || "{}");

    if (!budget || !risk || !goal) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing inputs" }),
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an investing planning assistant for beginners.

Create a ${accessMode === "paid" ? "full monthly investing plan" : "1-week demo investing plan"}.

User details:
- Budget: $${budget}
- Risk: ${risk}
- Goal: ${goal}

Requirements:
- Keep it beginner-friendly
- Keep it practical
- No guaranteed returns
- No legal/licensed-financial-advice wording
- Return clean HTML only using h4, p, strong, hr, ul, li
- Include:
  1. Plan title
  2. Allocation breakdown
  3. Strategy
  4. Weekly action steps
  5. Risk reminder
`;

    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: prompt,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        html: response.output_text || "<p>Unable to generate plan.</p>",
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
};
