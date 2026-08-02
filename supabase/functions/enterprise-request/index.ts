import { json, handleOptions, serviceClient, sendEmail } from '../_shared/utils.ts';

// Demande de devis entreprise (formulaire public) :
// enregistre un lead (kind='enterprise') + email à l'équipe.
// verify_jwt = false (visiteur anonyme).

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const { first_name, last_name, email, phone } = await req.json();
    if (!email) return json({ error: 'Email requis' }, 400);

    const svc = serviceClient();
    await svc.from('leads').insert({ kind: 'enterprise', email, first_name, last_name, phone });

    const adminTo = Deno.env.get('ADMIN_EMAIL') ?? 'contact@naky.fr';
    await sendEmail(
      adminTo,
      `Nouvelle demande de devis Entreprise - ${first_name ?? ''} ${last_name ?? ''}`,
      `<h2>Nouvelle demande de devis entreprise</h2>
      <p><strong>Prénom :</strong> ${first_name ?? ''}</p>
      <p><strong>Nom :</strong> ${last_name ?? ''}</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Téléphone :</strong> ${phone ?? ''}</p>`,
    );

    return json({ success: true });
  } catch (error) {
    console.error('enterprise-request:', error);
    return json({ error: error.message }, 500);
  }
});
