const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const sig = event.headers["stripe-signature"];

    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const email = session.customer_details?.email || session.customer_email;

      if (email) {
        await supabase.from("profiles").upsert({
          email: email,
          subscription_status: "active"
        });
      }
    }

    if (stripeEvent.type === "customer.subscription.deleted") {
      const subscription = stripeEvent.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);

      if (customer.email) {
        await supabase
          .from("profiles")
          .update({ subscription_status: "inactive" })
          .eq("email", customer.email);
      }
    }

    if (stripeEvent.type === "customer.subscription.updated") {
      const subscription = stripeEvent.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);

      if (customer.email) {
        const status = subscription.status === "active" ? "active" : "inactive";

        await supabase
          .from("profiles")
          .update({ subscription_status: status })
          .eq("email", customer.email);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };
  }
};
