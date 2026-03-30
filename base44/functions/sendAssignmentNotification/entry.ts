import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    // Déclencher seulement si employee_id vient d'être assigné (était vide avant)
    if (!data?.employee_id) return Response.json({ skipped: 'no employee assigned' });
    if (old_data?.employee_id === data.employee_id) return Response.json({ skipped: 'employee unchanged' });

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    const booking = data;

    // Récupérer le client
    let clientEmail, clientFirstName;
    if (booking.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: booking.client_id });
      if (clients && clients.length > 0) {
        clientEmail = clients[0].email;
        clientFirstName = clients[0].first_name;
      }
    }
    if (!clientEmail && booking.contact_details) {
      clientEmail = booking.contact_details.email;
      clientFirstName = booking.contact_details.first_name;
    }

    if (!clientEmail) return Response.json({ skipped: 'no client email found' });

    // Récupérer l'employée
    const employees = await base44.asServiceRole.entities.Employee.filter({ id: booking.employee_id });
    if (!employees || employees.length === 0) return Response.json({ skipped: 'employee not found' });
    const employee = employees[0];

    const serviceTypes = {
      regular: 'Ménage régulier',
      one_time: 'Ménage ponctuel',
      spring: 'Nettoyage de printemps',
      enterprise: 'Entreprise'
    };

    const serviceLabel = serviceTypes[booking.service_type] || booking.service_type;

    const emailBody = `
      <h2>Votre réservation est confirmée !</h2>
      <p>Bonjour ${clientFirstName},</p>
      <p>Nous avons le plaisir de vous confirmer votre réservation. Une femme de ménage vous a été assignée.</p>
      <hr>
      <p><strong>Votre femme de ménage :</strong> ${employee.first_name} ${employee.last_name}</p>
      <hr>
      <p><strong>Type de service :</strong> ${serviceLabel}</p>
      <p><strong>Adresse :</strong> ${booking.address}, ${booking.zipcode} ${booking.city}</p>
      <p><strong>Date :</strong> ${booking.date ? new Date(booking.date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: 'long', year: 'numeric' }) : 'Non définie'}</p>
      <p><strong>Heure :</strong> ${booking.time}</p>
      <p><strong>Durée :</strong> ${booking.duration}</p>
      ${booking.recurrence && booking.recurrence !== 'none' ? `<p><strong>Récurrence :</strong> ${booking.recurrence}</p>` : ''}
      <hr>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>Cordialement,<br>L'équipe Naky</p>
    `;

    // Encoder le sujet en base64url pour supporter les accents
    const subjectRaw = 'Votre réservation Naky est confirmée';
    const encodedSubject = `=?utf-8?B?${btoa(encodeURIComponent(subjectRaw).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))}?=`;

    const message = [
      `To: ${clientEmail}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      emailBody
    ].join('\r\n');

    const uint8Array = new TextEncoder().encode(message);
    let binary = '';
    for (const byte of uint8Array) {
      binary += String.fromCharCode(byte);
    }
    const encodedMessage = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gmail API error: ${err}`);
    }

    return Response.json({ success: true, sentTo: clientEmail });
  } catch (error) {
    console.error('Error sending assignment notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});