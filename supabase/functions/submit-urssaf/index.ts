import { json, handleOptions, getCaller, requireAdmin, serviceClient, sendEmail } from '../_shared/utils.ts';

// Soumission du dossier URSSAF (avance immédiate).
// Appelée par le client (son propre dossier) ou par un admin (pour n'importe quel client).
// Payload : { clientId, formData } — formData = identité + contact + bancaire + adresse normée.
//  - upsert client_urssaf_details + met à jour clients (urssaf_completed, ai_status)
//  - POST vers le webhook Make URSSAF (URL secrète), récupère idAbby
//  - email de confirmation au client

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const caller = await getCaller(req);
    if (!caller) return json({ error: 'Authentification requise' }, 401);

    const { clientId, formData } = await req.json();
    if (!clientId || !formData) return json({ error: 'clientId / formData manquants' }, 400);

    const svc = serviceClient();
    const { data: client } = await svc.from('clients').select('*').eq('id', clientId).maybeSingle();
    if (!client) return json({ error: 'Client introuvable' }, 404);

    // Autorisation : le client lui-même, ou un admin
    if (client.user_id !== caller.id && !(await requireAdmin(req))) {
      return json({ error: 'Accès refusé' }, 403);
    }

    const {
      civilite, first_name, last_name, email, phone,
      nom_naissance, birthdate, pays_naissance, zipcode_naissance,
      iban, bic, account_holder,
      numero_voie, lettre_voie, type_voie, nom_voie, lieu_dit,
      complement_adresse, pays, zipcode, city,
    } = formData;

    await svc.from('client_urssaf_details').upsert({
      client_id: clientId,
      nom_naissance, birthdate, pays_naissance, zipcode_naissance,
      iban, bic, account_holder,
      numero_voie, lettre_voie, type_voie, nom_voie, lieu_dit,
      complement_adresse, pays, zipcode, city,
      updated_at: new Date().toISOString(),
    });

    await svc.from('clients').update({
      civilite: civilite ?? client.civilite,
      first_name: first_name ?? client.first_name,
      last_name: last_name ?? client.last_name,
      phone: phone ?? client.phone,
      urssaf_completed: true,
      ai_status: 'completed',
    }).eq('id', clientId);

    // Webhook Make → création du client dans Abby
    let idAbby: string | null = null;
    const webhookUrl = Deno.env.get('MAKE_URSSAF_WEBHOOK_URL');
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, action: 'create', email: email ?? client.email, ...formData }),
        });
        if (res.ok) {
          const makeData = await res.json().catch(() => ({}));
          if (makeData?.idAbby) {
            idAbby = makeData.idAbby;
            await svc.from('clients').update({ abby_id: idAbby }).eq('id', clientId);
          }
        } else {
          console.error('Make URSSAF webhook failed:', res.status, await res.text());
        }
      } catch (e) {
        console.error('Make URSSAF webhook error:', e);
      }
    }

    // Email de confirmation
    try {
      await sendEmail(
        email ?? client.email,
        'Votre dossier URSSAF a bien été envoyé',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E95678;">Votre dossier URSSAF est en cours de validation</h2>
          <p>Bonjour ${first_name ?? client.first_name},</p>
          <p>Nous avons bien reçu vos informations et votre dossier a été transmis à l'URSSAF.</p>
          <div style="background: #fff8e1; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #92400e;">⏳ En attente de validation</p>
            <p style="margin: 8px 0 0 0; color: #78350f;">
              L'URSSAF va vous envoyer sous peu un e-mail pour valider vos informations.
              Pensez à vérifier vos spams.
            </p>
          </div>
          <p>L'équipe Naky</p>
        </div>`,
      );
    } catch (e) {
      console.error('Email URSSAF non envoyé:', e);
    }

    return json({ success: true, idAbby });
  } catch (error) {
    console.error('submit-urssaf:', error);
    return json({ error: error.message }, 500);
  }
});
