const OpenAI = require("openai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { budget, risk, goal, accessMode } = JSON.parse(event.body || "{}");

    if (!budget || !risk || !goal) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing inputs" }),
      };
    }

    const numericBudget = Number(budget);

    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Budget must be a valid number greater than 0" }),
      };
    }

    const allowedRisk = ["Low", "Medium", "High"];
    const allowedGoal = ["Short-Term", "Long-Term", "Both"];

    if (!allowedRisk.includes(risk) || !allowedGoal.includes(goal)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid risk or goal value" }),
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const planType =
      accessMode === "paid"
        ? "full monthly investing plan"
        : "1-week demo investing plan";

    const prompt = `
You are an investing planning assistant for beginners.

Create a ${planType}.

User details:
- Budget: $${numericBudget}
- Risk: ${risk}
- Goal: ${goal}

Requirements:
- Keep it beginner-friendly
- Keep it practical
- Do not promise profits or guaranteed returns
- Do not present this as licensed financial advice
- Return clean HTML only using: h4, p, strong, hr, ul, li
- No markdown
- Include:
  1. Plan title
  2. Allocation breakdown
  3. Strategy
  4. Weekly action steps
  5. Risk reminder
`;

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: response.output_text || "<p>Unable to generate plan.</p>",
      }),
    };
  } catch (err) {
    console.error("generate-plan error:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: err.message || "Server error",
      }),
    };
  }
};
