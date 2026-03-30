import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email requis' }, { status: 400 });
    }

    const clients = await base44.asServiceRole.entities.Client.filter({ email });

    if (!clients || clients.length === 0) {
      return Response.json({ success: true });
    }

    const client = clients[0];
    const password = client.password;

    if (!password) {
      return Response.json({ error: 'Aucun mot de passe associé à ce compte.' }, { status: 400 });
    }

    // Obtenir le token Gmail
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #E95678;">Votre mot de passe Naky</h2>
        <p>Bonjour ${client.first_name || ''},</p>
        <p>Vous avez demandé à récupérer votre mot de passe. Le voici :</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; font-size: 18px; font-weight: bold; letter-spacing: 2px; text-align: center; margin: 20px 0;">
          ${password}
        </div>
        <p style="color: #888; font-size: 13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        <p>L'équipe Naky</p>
      </div>
    `;

    // Construire le message MIME
    const boundary = 'boundary_naky_' + Date.now();
    const mimeMessage = [
      `From: Naky <contact@naky.fr>`,
      `To: ${email}`,
      `Subject: Votre mot de passe Naky`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlBody
    ].join('\r\n');

    const encodedMessage = btoa(unescape(encodeURIComponent(mimeMessage)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const gmailRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      }
    );

    if (!gmailRes.ok) {
      const err = await gmailRes.text();
      console.error('Gmail send error:', err);
      return Response.json({ error: 'Erreur envoi email' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('forgotPassword error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});