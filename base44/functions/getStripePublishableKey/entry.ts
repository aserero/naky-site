import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    return Response.json({ key: Deno.env.get("STRIPE_PUBLISHABLE_KEY") });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});