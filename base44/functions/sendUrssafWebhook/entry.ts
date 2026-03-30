import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/dxqbpxbvtrqbdojfhkusqxykt4iowaz3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clientId, formData, action } = await req.json();

    // Send webhook to Make
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        action: action || 'create',
        ...formData
      })
    });

    if (!response.ok) {
      console.error('Make webhook failed:', response.status, await response.text());
      return Response.json({ error: 'Webhook failed' }, { status: 502 });
    }

    // Lire la réponse de Make (contient idAbby et clientId)
    const makeData = await response.json();

    // Mettre à jour la fiche client avec l'idAbby
    if (makeData.idAbby) {
      await base44.asServiceRole.entities.Client.update(clientId, {
        idAbby: makeData.idAbby
      });
      console.log(`idAbby ${makeData.idAbby} enregistré pour le client ${clientId}`);
    }

    return Response.json({ success: true, idAbby: makeData.idAbby });
  } catch (error) {
    console.error('sendUrssafWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});