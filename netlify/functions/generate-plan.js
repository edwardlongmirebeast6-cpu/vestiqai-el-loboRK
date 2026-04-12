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
      ? "Return only a 1-week demo investing plan."
      : "Return a full monthly investing plan with weekly breakdown.";

    const prompt = `
You are an investing planning assistant for beginners.
Do not provide guaranteed returns.
Do not claim certainty.
Do not present this as licensed financial advice.
Be clear, practical, beginner-friendly, and encouraging.

User inputs:
- Monthly budget: $${budget}
- Risk level: ${risk}
- Goal: ${goal}

Instructions:
- ${planScope}
- Focus on structure, discipline, and beginner-friendly investing habits.
- Include:
  1. Plan title
  2. Budget summary
  3. Allocation suggestion
  4. Strategy insight
  5. Action steps
  6. Risk reminder
- Keep it concise and premium.
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
        input: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "OpenAI request failed", details: errorText }),
      };
    }

    const data = await response.json();

    const html =
      data.output_text ||
      "<h4>Plan unavailable</h4><p>We couldn't generate your plan right now.</p>";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server error",
        details: error.message,
      }),
    };
  }
};
