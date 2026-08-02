import {
  json, handleOptions, serviceClient, sendEmail,
  SERVICE_LABELS, formatDateFr, formatTimeFr, formatDurationFr,
} from '../_shared/utils.ts';

// Email au client quand une employée vient d'être assignée à sa réservation.
// Déclenchée par un Database Webhook Supabase (UPDATE sur bookings) —
// configurer le webhook avec le header x-webhook-secret = DB_WEBHOOK_SECRET.
// Payload Supabase : { type, table, record, old_record }

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const secret = Deno.env.get('DB_WEBHOOK_SECRET');
    if (secret && req.headers.get('x-webhook-secret') !== secret) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { record, old_record } = await req.json();
    if (!record?.employee_id) return json({ skipped: 'no employee assigned' });
    if (old_record?.employee_id === record.employee_id) return json({ skipped: 'employee unchanged' });

    const svc = serviceClient();
    const { data: client } = record.client_id
      ? await svc.from('clients').select('email, first_name').eq('id', record.client_id).maybeSingle()
      : { data: null };
    if (!client?.email) return json({ skipped: 'no client email' });

    const { data: employee } = await svc.from('employees')
      .select('first_name, last_name').eq('id', record.employee_id).maybeSingle();
    if (!employee) return json({ skipped: 'employee not found' });

    const serviceLabel = SERVICE_LABELS[record.service_type] ?? record.service_type;

    await sendEmail(
      client.email,
      'Votre réservation Naky est confirmée',
      `<h2>Votre réservation est confirmée !</h2>
      <p>Bonjour ${client.first_name},</p>
      <p>Nous avons le plaisir de vous confirmer votre réservation. Une femme de ménage vous a été assignée.</p>
      <hr>
      <p><strong>Votre femme de ménage :</strong> ${employee.first_name} ${employee.last_name}</p>
      <hr>
      <p><strong>Type de service :</strong> ${serviceLabel}</p>
      <p><strong>Adresse :</strong> ${record.address}, ${record.zipcode} ${record.city}</p>
      <p><strong>Date :</strong> ${formatDateFr(record.date)}</p>
      <p><strong>Heure :</strong> ${formatTimeFr(record.start_time)}</p>
      <p><strong>Durée :</strong> ${formatDurationFr(record.duration_minutes)}</p>
      ${record.recurrence !== 'none' ? `<p><strong>Récurrence :</strong> ${record.recurrence}</p>` : ''}
      <hr>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>Cordialement,<br>L'équipe Naky</p>`,
    );

    return json({ success: true, sentTo: client.email });
  } catch (error) {
    console.error('notify-assignment:', error);
    return json({ error: error.message }, 500);
  }
});
