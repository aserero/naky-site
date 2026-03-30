import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
const formatDateParis = (dateStr) => {
  if (!dateStr) return 'Non définie';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { bookingId } = await req.json();

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    // Récupérer la réservation
    const bookings = await base44.asServiceRole.entities.Booking.filter({ id: bookingId });
    if (!bookings || bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    // Récupérer les infos du client
    let clientEmail, clientFirstName, clientLastName, clientPhone, clientFullData;
    if (booking.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: booking.client_id });
      if (clients && clients.length > 0) {
        const client = clients[0];
        clientEmail = client.email;
        clientFirstName = client.first_name;
        clientLastName = client.last_name;
        clientPhone = client.phone;
        clientFullData = client;
      }
    }

    // Fallback sur contact_details si présent
    if (!clientEmail && booking.contact_details) {
      clientEmail = booking.contact_details.email;
      clientFirstName = booking.contact_details.first_name;
      clientLastName = booking.contact_details.last_name;
      clientPhone = booking.contact_details.phone;
    }

    const serviceTypes = {
      regular: 'Ménage régulier',
      one_time: 'Ménage ponctuel',
      spring: 'Nettoyage de printemps',
      enterprise: 'Entreprise'
    };

    const serviceLabel = serviceTypes[booking.service_type] || booking.service_type;

    const adminEmailBody = `
      <h2>Nouvelle demande de ménage</h2>
      <p><strong>Client:</strong> ${clientFirstName} ${clientLastName}</p>
      <p><strong>Email:</strong> ${clientEmail}</p>
      <p><strong>Téléphone:</strong> ${clientPhone || 'Non renseigné'}</p>
      <hr>
      <p><strong>Type de service:</strong> ${serviceLabel}</p>
      <p><strong>Adresse d'intervention:</strong> ${booking.address}, ${booking.zipcode} ${booking.city}</p>
      ${booking.additional_address ? `<p><strong>Complément:</strong> ${booking.additional_address}</p>` : ''}
      <p><strong>Date:</strong> ${formatDateParis(booking.date)}</p>
      <p><strong>Heure:</strong> ${booking.time}</p>
      <p><strong>Durée:</strong> ${booking.duration}</p>
      <p><strong>Prix total:</strong> ${booking.total_price}€</p>
      ${booking.recurrence && booking.recurrence !== 'none' ? `<p><strong>Récurrence:</strong> ${booking.recurrence}</p>` : ''}
      ${booking.instructions ? `<p><strong>Instructions:</strong> ${booking.instructions}</p>` : ''}
      <p><strong>Avance immédiate:</strong> ${booking.advance_immediate ? 'Oui' : 'Non'}</p>
      <p><strong>Animaux:</strong> ${booking.has_animals ? 'Oui' : 'Non'}</p>
      <p><strong>Produits fournis:</strong> ${booking.has_cleaning_supplies ? 'Oui' : 'Non'}</p>
      ${clientFullData ? `<hr><h3>Informations complètes du client</h3>
      ${clientFullData.birthdate ? `<p><strong>Date de naissance:</strong> ${clientFullData.birthdate}</p>` : ''}
      ${clientFullData.iban ? `<p><strong>IBAN:</strong> ${clientFullData.iban}</p>` : ''}
      ${clientFullData.bic ? `<p><strong>BIC:</strong> ${clientFullData.bic}</p>` : ''}
      ${clientFullData.account_holder ? `<p><strong>Titulaire:</strong> ${clientFullData.account_holder}</p>` : ''}
      ${clientFullData.address ? `<p><strong>Adresse client:</strong> ${clientFullData.address}, ${clientFullData.zipcode} ${clientFullData.city}</p>` : ''}
      ` : ''}
    `;

    const clientEmailBody = `
      <h2>Confirmation de votre réservation</h2>
      <p>Bonjour ${clientFirstName},</p>
      <p>Nous avons bien reçu votre demande de réservation.</p>
      <hr>
      <p><strong>Type de service:</strong> ${serviceLabel}</p>
      <p><strong>Adresse:</strong> ${booking.address}, ${booking.zipcode} ${booking.city}</p>
      <p><strong>Date:</strong> ${formatDateParis(booking.date)}</p>
      <p><strong>Heure:</strong> ${booking.time}</p>
      <p><strong>Durée:</strong> ${booking.duration}</p>
      <p><strong>Prix total:</strong> ${booking.total_price}€</p>
      ${booking.recurrence && booking.recurrence !== 'none' ? `<p><strong>Récurrence:</strong> ${booking.recurrence}</p>` : ''}
      <hr>
      <p>Nous vous recontacterons rapidement pour confirmer votre rendez-vous.</p>
      <p>Cordialement,<br>L'équipe Naky</p>
    `;

    const sendGmailEmail = async (to, subject, html) => {
      // Encoder le sujet en base64 pour supporter les accents
      const encodedSubject = `=?utf-8?B?${btoa(encodeURIComponent(subject).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))}?=`;

      const message = [
        `To: ${to}`,
        `Subject: ${encodedSubject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        html
      ].join('\r\n');

      // Encoder le message en base64url compatible UTF-8
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
        throw new Error(`Gmail API error sending to ${to}: ${err}`);
      }

      return response.json();
    };

    const promises = [
      sendGmailEmail(
        'contact@naky.fr',
        `Nouvelle réservation - ${clientFirstName} ${clientLastName}`,
        adminEmailBody
      )
    ];

    if (clientEmail) {
      const halfPrice = booking.total_price ? (booking.total_price / 2).toFixed(2) : null;
      const clientEmailBodyFinal = clientEmailBody.replace(`<p><strong>Prix total:</strong> ${booking.total_price}€</p>`, `<p><strong>Prix après crédit d'impôt (50%) :</strong> ${halfPrice}€</p>`);
      promises.push(
        sendGmailEmail(
          clientEmail,
          'Confirmation de votre réservation Naky',
          clientEmailBodyFinal
        )
      );
    }

    await Promise.all(promises);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});