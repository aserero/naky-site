import Stripe from 'npm:stripe@14.21.0';
import { json, handleOptions } from '../_shared/utils.ts';

// Crée (ou retrouve) un customer Stripe par email et renvoie un SetupIntent
// (empreinte de carte, aucun débit). Appelée par le funnel — visiteur non
// authentifié possible → verify_jwt = false dans config.toml.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const { clientEmail, clientName } = await req.json();
    if (!clientEmail) return json({ error: 'Email requis' }, 400);

    const customers = await stripe.customers.list({ email: clientEmail, limit: 1 });
    const customer = customers.data[0]
      ?? await stripe.customers.create({ email: clientEmail, name: clientName });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return json({ clientSecret: setupIntent.client_secret, customerId: customer.id });
  } catch (error) {
    console.error('create-setup-intent:', error);
    return json({ error: error.message }, 500);
  }
});
