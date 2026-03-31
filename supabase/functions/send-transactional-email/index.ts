const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { sendTransactionalEmail, type TransactionalEmailPayload } from '../_shared/emailProvider.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as TransactionalEmailPayload;

    if (!payload?.to || !payload?.subject || !payload?.html) {
      return Response.json({ error: 'Missing email payload' }, { status: 400, headers: corsHeaders });
    }

    const result = await sendTransactionalEmail(payload);
    return Response.json({ success: true, ...result }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
