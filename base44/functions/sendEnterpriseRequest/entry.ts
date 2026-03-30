import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { first_name, last_name, email, phone } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    const emailBody = [
      `Nouvelle demande de devis entreprise`,
      ``,
      `Prénom : ${first_name}`,
      `Nom : ${last_name}`,
      `Email : ${email}`,
      `Téléphone : ${phone}`,
    ].join('\n');

    const message = [
      `From: Naky <contact@naky.fr>`,
      `To: contact@naky.fr`,
      `Subject: Nouvelle demande de devis Entreprise - ${first_name} ${last_name}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      emailBody,
    ].join('\r\n');

    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Gmail error:', err);
      return Response.json({ error: err }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});