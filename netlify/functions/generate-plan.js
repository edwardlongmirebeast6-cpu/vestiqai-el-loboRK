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
        body: JSON.stringify({ error: "Missing budget, risk, or goal" }),
      };
    }

    const isDemo = accessMode !== "paid";

    const planScope = isDemo
      ? "Return only a 1-week beginner investing plan."
      : "Return a full 4-week monthly investing plan with weekly breakdown.";

    const prompt = `
You are an investing planning assistant for beginners.

Rules:
- Do not guarantee profits.
- Do not present this as licensed financial advice.
- Be practical, beginner-friendly, and concise.
- Focus on structure, discipline, and risk awareness.

User inputs:
- Monthly budget: $${budget}
- Risk level: ${risk}
- Goal: ${goal}

Instructions:
- ${planScope}
- Include:
  1. Plan title
  2. Budget breakdown
  3. Strategy insight
  4. Action steps
  5. Risk reminder
- Return plain HTML only using tags like h4, p, strong, hr, ul, li.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: prompt
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "OpenAI request failed",
          details: errorText
        }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: data.output_text || "<h4>Plan unavailable</h4><p>We couldn't generate your plan right now.</p>"
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server error",
        details: error.message
      }),
    };
  }
};
