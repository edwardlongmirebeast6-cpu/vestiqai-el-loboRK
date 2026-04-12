const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const signature = event.headers["stripe-signature"];
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const userId = session.metadata?.supabase_user_id;

      if (userId) {
        await supabase
          .from("profiles")
          .upsert({
            id: userId,
            email: session.customer_email,
            stripe_customer_id: session.customer,
            subscription_status: "active",
            plan_tier: "paid"
          });
      }
    }

    if (
      stripeEvent.type === "customer.subscription.deleted" ||
      stripeEvent.type === "customer.subscription.updated"
    ) {
      const sub = stripeEvent.data.object;

      if (sub.customer) {
        await supabase
          .from("profiles")
          .update({
            subscription_status: sub.status === "active" ? "active" : "inactive"
          })
          .eq("stripe_customer_id", sub.customer);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${error.message}`
    };
  }
};
