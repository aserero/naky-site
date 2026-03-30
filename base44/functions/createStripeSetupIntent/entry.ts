import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clientEmail, clientName } = await req.json();

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({ email: clientEmail, limit: 1 });
    let customer;

    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: clientEmail,
        name: clientName,
        metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID") }
      });
    }

    // Create a SetupIntent (card fingerprint - no charge)
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID") }
    });

    return Response.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (error) {
    console.error('Stripe setup intent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});