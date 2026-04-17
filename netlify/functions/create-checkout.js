const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const authHeader =
      event.headers.authorization || event.headers.Authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing auth token" }),
      };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const { priceId, planTier } = JSON.parse(event.body || "{}");

    if (!priceId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing priceId" }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/`,
      customer_email: user.email,
      metadata: {
        supabase_user_id: user.id,
        plan_tier: planTier || "pro",
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_tier: planTier || "pro",
        },
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error("create-checkout-session error:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Server error" }),
    };
  }
};
