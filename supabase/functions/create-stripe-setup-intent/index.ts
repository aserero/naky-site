import Stripe from 'npm:stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!stripe) {
      return Response.json(
        { error: 'Missing STRIPE_SECRET_KEY secret' },
        { status: 500, headers: corsHeaders },
      );
    }

    const { clientEmail, clientName } = await req.json();

    if (!clientEmail) {
      return Response.json(
        { error: 'Missing clientEmail' },
        { status: 400, headers: corsHeaders },
      );
    }

    const customers = await stripe.customers.list({
      email: clientEmail,
      limit: 1,
    });

    const customer =
      customers.data[0] ||
      (await stripe.customers.create({
        email: clientEmail,
        name: clientName || undefined,
      }));

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        source: 'naky-supabase',
      },
    });

    return Response.json(
      {
        clientSecret: setupIntent.client_secret,
        customerId: customer.id,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
