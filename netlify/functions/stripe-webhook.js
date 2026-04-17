const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const signature =
      event.headers["stripe-signature"] || event.headers["Stripe-Signature"];

    if (!signature) {
      return {
        statusCode: 400,
        body: "Missing Stripe signature",
      };
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    const stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      const userId =
        session.metadata?.supabase_user_id ||
        session.subscription_details?.metadata?.supabase_user_id ||
        null;

      const planTier =
        session.metadata?.plan_tier ||
        session.subscription_details?.metadata?.plan_tier ||
        "pro";

      const email = session.customer_details?.email || session.customer_email || null;

      if (userId) {
        const upsertPayload = {
          id: userId,
          email,
          subscription_status: "active",
          plan_tier: planTier,
        };

        const { error } = await supabase.from("profiles").upsert(upsertPayload);
        if (error) throw error;
      } else if (email) {
        const { error } = await supabase
          .from("profiles")
          .update({
            email,
            subscription_status: "active",
            plan_tier: planTier,
          })
          .eq("email", email);

        if (error) throw error;
      }
    }

    if (stripeEvent.type === "customer.subscription.updated") {
      const subscription = stripeEvent.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);

      const userId = subscription.metadata?.supabase_user_id || null;
      const planTier = subscription.metadata?.plan_tier || null;
      const email = customer.email || null;
      const status = subscription.status === "active" ? "active" : "inactive";

      if (userId) {
        const updatePayload = { subscription_status: status };
        if (planTier) updatePayload.plan_tier = planTier;
        if (email) updatePayload.email = email;

        const { error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", userId);

        if (error) throw error;
      } else if (email) {
        const updatePayload = { subscription_status: status };
        if (planTier) updatePayload.plan_tier = planTier;

        const { error } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("email", email);

        if (error) throw error;
      }
    }

    if (stripeEvent.type === "customer.subscription.deleted") {
      const subscription = stripeEvent.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);

      const userId = subscription.metadata?.supabase_user_id || null;
      const email = customer.email || null;

      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({ subscription_status: "inactive" })
          .eq("id", userId);

        if (error) throw error;
      } else if (email) {
        const { error } = await supabase
          .from("profiles")
          .update({ subscription_status: "inactive" })
          .eq("email", email);

        if (error) throw error;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    console.error("stripe-webhook error:", err);

    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};
