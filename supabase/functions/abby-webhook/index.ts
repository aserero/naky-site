import { json, handleOptions, serviceClient } from '../_shared/utils.ts';

// Webhook entrant (Abby/Make) : stocke l'idAbby sur la fiche client.
// Payload : { clientId, idAbby } — protégé par le header x-abby-secret.

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const secret = Deno.env.get('ABBY_WEBHOOK_SECRET');
    if (secret) {
      const header = req.headers.get('x-abby-secret') ?? req.headers.get('authorization') ?? '';
      if (!header.includes(secret)) return json({ error: 'Unauthorized' }, 401);
    }

    const { clientId, idAbby } = await req.json();
    if (!clientId || !idAbby) return json({ error: 'clientId / idAbby manquants' }, 400);

    const svc = serviceClient();
    const { error } = await svc.from('clients').update({ abby_id: idAbby }).eq('id', clientId);
    if (error) throw error;

    return json({ success: true });
  } catch (error) {
    console.error('abby-webhook:', error);
    return json({ error: error.message }, 500);
  }
});
