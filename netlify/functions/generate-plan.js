exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { budget, risk, goal, accessMode } = JSON.parse(event.body);

    if (!budget || !risk || !goal) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing inputs" }),
      };
    }

    const isDemo = accessMode !== "paid";

    const planScope = isDemo
      ? "Return only a 1-week beginner investing plan."
      : "Return a full 4-week monthly investing plan with weekly breakdown.";

    const prompt = `
You are an investing planner for beginners.

User:
- Budget: $${budget}
- Risk: ${risk}
- Goal: ${goal}

Instructions:
- ${planScope}
- Keep it simple, structured, and beginner-friendly
- Include:
  1. Plan title
  2. Budget breakdown
  3. Strategy
  4. Action steps
  5. Risk reminder
- Format in clean HTML only (h4, p, strong, hr)

No fluff. No financial guarantees.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: prompt,
      }),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        html: data.output_text || "<p>Error generating plan.</p>",
      }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error",
        details: err.message,
      }),
    };
  }
};
