const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const key = Deno.env.get('STRIPE_PUBLISHABLE_KEY');

    if (!key) {
      return Response.json(
        { error: 'Missing STRIPE_PUBLISHABLE_KEY secret' },
        { status: 500, headers: corsHeaders },
      );
    }

    return Response.json({ key }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
