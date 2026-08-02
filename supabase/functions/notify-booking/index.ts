import {
  json, handleOptions, getCaller, serviceClient, sendEmail,
  SERVICE_LABELS, formatDateFr, formatTimeFr, formatDurationFr,
} from '../_shared/utils.ts';

// Notification d'une nouvelle réservation : récap à l'équipe + confirmation au client.
// Payload : { bookingId }. Appelée juste après la création (utilisateur authentifié).

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const caller = await getCaller(req);
    if (!caller) return json({ error: 'Authentification requise' }, 401);

    const { bookingId } = await req.json();
    if (!bookingId) return json({ error: 'bookingId manquant' }, 400);

    const svc = serviceClient();
    const { data: booking } = await svc.from('bookings').select('*').eq('id', bookingId).maybeSingle();
    if (!booking) return json({ error: 'Réservation introuvable' }, 404);

    const { data: client } = booking.client_id
      ? await svc.from('clients').select('*').eq('id', booking.client_id).maybeSingle()
      : { data: null };

    const serviceLabel = SERVICE_LABELS[booking.service_type] ?? booking.service_type;
    const adminTo = Deno.env.get('ADMIN_EMAIL') ?? 'contact@naky.fr';
    const dateStr = formatDateFr(booking.date);
    const timeStr = formatTimeFr(booking.start_time);
    const durationStr = formatDurationFr(booking.duration_minutes);

    const adminBody = `
      <h2>Nouvelle demande de ménage</h2>
      <p><strong>Client:</strong> ${client?.first_name ?? ''} ${client?.last_name ?? ''}</p>
      <p><strong>Email:</strong> ${client?.email ?? ''}</p>
      <p><strong>Téléphone:</strong> ${client?.phone ?? 'Non renseigné'}</p>
      <hr>
      <p><strong>Type de service:</strong> ${serviceLabel}</p>
      <p><strong>Adresse d'intervention:</strong> ${booking.address}, ${booking.zipcode} ${booking.city}</p>
      ${booking.additional_address ? `<p><strong>Complément:</strong> ${booking.additional_address}</p>` : ''}
      <p><strong>Date:</strong> ${dateStr}</p>
      <p><strong>Heure:</strong> ${timeStr}</p>
      <p><strong>Durée:</strong> ${durationStr}</p>
      <p><strong>Prix total:</strong> ${booking.total_price}€</p>
      ${booking.recurrence !== 'none' ? `<p><strong>Récurrence:</strong> ${booking.recurrence}</p>` : ''}
      ${booking.instructions ? `<p><strong>Instructions:</strong> ${booking.instructions}</p>` : ''}
      <p><strong>Avance immédiate:</strong> ${booking.advance_immediate ? 'Oui' : 'Non'}</p>
      <p><strong>Animaux:</strong> ${booking.has_animals ? 'Oui' : 'Non'}</p>
      <p><strong>Produits fournis:</strong> ${booking.has_cleaning_supplies ? 'Oui' : 'Non'}</p>
    `;

    const priceLine = booking.advance_immediate
      ? `<p><strong>Prix après crédit d'impôt (50%) :</strong> ${(booking.total_price / 2).toFixed(2)}€</p>`
      : `<p><strong>Prix total:</strong> ${booking.total_price}€</p>`;

    const clientBody = `
      <h2>Confirmation de votre réservation</h2>
      <p>Bonjour ${client?.first_name ?? ''},</p>
      <p>Nous avons bien reçu votre demande de réservation.</p>
      <hr>
      <p><strong>Type de service:</strong> ${serviceLabel}</p>
      <p><strong>Adresse:</strong> ${booking.address}, ${booking.zipcode} ${booking.city}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
      <p><strong>Heure:</strong> ${timeStr}</p>
      <p><strong>Durée:</strong> ${durationStr}</p>
      ${priceLine}
      ${booking.recurrence !== 'none' ? `<p><strong>Récurrence:</strong> ${booking.recurrence}</p>` : ''}
      <hr>
      <p>Nous vous recontacterons rapidement pour confirmer votre rendez-vous.</p>
      <p>Cordialement,<br>L'équipe Naky</p>
    `;

    const jobs = [
      sendEmail(adminTo, `Nouvelle réservation - ${client?.first_name ?? ''} ${client?.last_name ?? ''}`, adminBody),
    ];
    if (client?.email) {
      jobs.push(sendEmail(client.email, 'Confirmation de votre réservation Naky', clientBody));
    }
    await Promise.all(jobs);

    return json({ success: true });
  } catch (error) {
    console.error('notify-booking:', error);
    return json({ error: error.message }, 500);
  }
});
