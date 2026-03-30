import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// This function receives the response from the Abby webhook
// and stores the idAbby on the client record.
// Expected payload: { clientId: string, idAbby: string }
// Can also be called as a webhook from Abby with a shared secret.

const SHARED_SECRET = Deno.env.get("ABBY_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // If a shared secret is configured, validate it
    if (SHARED_SECRET) {
      const authHeader = req.headers.get("x-abby-secret") || req.headers.get("authorization");
      if (!authHeader || !authHeader.includes(SHARED_SECRET)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json();
    const { clientId, idAbby } = body;

    if (!clientId || !idAbby) {
      return Response.json({ error: 'Missing clientId or idAbby' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Client.update(clientId, { idAbby });

    console.log(`idAbby ${idAbby} stored for client ${clientId}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('abbyWebhookResponse error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});