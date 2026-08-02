import { json, handleOptions, requireAdmin, serviceClient } from '../_shared/utils.ts';

// Facturation d'une réservation via Make/Abby — ADMIN uniquement.
// Consolide la logique auparavant dupliquée (et exposée) dans le navigateur.
// Payload : { bookingId, paymentType: 'stripe' | 'urssaf' }
//  - construit le payload complet (booking + client + employée + grille tarifaire)
//  - POST vers le webhook Make (URL secrète côté serveur)
//  - stocke le PDF de facture dans le bucket privé "invoices"
//  - met à jour bookings.billing_status / abby_invoice_id / invoice_file_path
//  - crée la ligne invoices (type 'client')

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const admin = await requireAdmin(req);
    if (!admin) return json({ error: 'Accès refusé' }, 403);

    const { bookingId, paymentType } = await req.json();
    if (!bookingId || !['stripe', 'urssaf'].includes(paymentType)) {
      return json({ error: 'bookingId / paymentType invalides' }, 400);
    }

    const webhookUrl = Deno.env.get('MAKE_BILLING_WEBHOOK_URL');
    if (!webhookUrl) return json({ error: 'MAKE_BILLING_WEBHOOK_URL non configurée' }, 500);

    const svc = serviceClient();
    const { data: booking } = await svc.from('bookings').select('*').eq('id', bookingId).maybeSingle();
    if (!booking) return json({ error: 'Réservation introuvable' }, 404);

    const { data: client } = booking.client_id
      ? await svc.from('clients').select('*').eq('id', booking.client_id).maybeSingle()
      : { data: null };
    const { data: urssaf } = booking.client_id
      ? await svc.from('client_urssaf_details').select('*').eq('client_id', booking.client_id).maybeSingle()
      : { data: null };
    const { data: employee } = booking.employee_id
      ? await svc.from('employees').select('*').eq('id', booking.employee_id).maybeSingle()
      : { data: null };

    const durationHours = booking.duration_minutes / 60;
    const [h, m] = (booking.start_time ?? '0:0').split(':').map(Number);

    const payload = {
      payment_type: paymentType,
      booking: {
        id: booking.id,
        date: booking.date,
        time: h + (m || 0) / 60,
        duration: durationHours,
        address: booking.address,
        zipcode: booking.zipcode,
        city: booking.city,
        service_type: booking.service_type,
        recurrence: booking.recurrence,
        base_price_per_hour: booking.hourly_rate,
        base_price_total: Math.round(booking.hourly_rate * durationHours * 100), // centimes
        total_price: booking.total_price,
        status: booking.status,
        urssaf_status: booking.urssaf_status,
        payment_method: paymentType,
        instructions: booking.instructions,
        has_animals: booking.has_animals,
        has_cleaning_supplies: booking.has_cleaning_supplies,
      },
      client: client ? {
        id: client.id,
        idAbby: client.abby_id ?? '',
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone ?? '',
        address: client.address ?? '',
        zipcode: client.zipcode ?? '',
        city: client.city ?? '',
        iban: urssaf?.iban ?? '',
        bic: urssaf?.bic ?? '',
        account_holder: urssaf?.account_holder ?? '',
        stripe_payment_method_id: client.stripe_payment_method_id ?? '',
        stripe_customer_id: client.stripe_customer_id ?? '',
        urssaf_completed: client.urssaf_completed,
      } : null,
      employee: employee ? {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email ?? null,
      } : null,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Make webhook failed:', res.status, await res.text());
      return json({ error: 'Échec du webhook de facturation' }, 502);
    }
    const makeData = await res.json().catch(() => ({}));
    const invoiceId = makeData?.idFacture ?? null;

    // PDF renvoyé en base64 → bucket privé, rangé par client
    let invoiceFilePath: string | null = null;
    if (makeData?.factureFile && booking.client_id) {
      const bytes = Uint8Array.from(atob(makeData.factureFile), (c) => c.charCodeAt(0));
      invoiceFilePath = `clients/${booking.client_id}/facture-${booking.id}.pdf`;
      const { error: upErr } = await svc.storage.from('invoices')
        .upload(invoiceFilePath, bytes, { contentType: 'application/pdf', upsert: true });
      if (upErr) {
        console.error('Upload facture:', upErr);
        invoiceFilePath = null;
      }
    }

    const bookingUpdates: Record<string, unknown> = {
      billing_status: paymentType === 'urssaf' ? 'avance_immediate' : 'generated',
      payment_method: paymentType,
    };
    if (invoiceId) bookingUpdates.abby_invoice_id = invoiceId;
    if (invoiceFilePath) bookingUpdates.invoice_file_path = invoiceFilePath;
    await svc.from('bookings').update(bookingUpdates).eq('id', bookingId);

    await svc.from('invoices').insert({
      type: 'client',
      number: invoiceId ?? `INV-${booking.id.slice(0, 8)}`,
      client_id: booking.client_id,
      booking_id: booking.id,
      amount: booking.total_price,
      status: paymentType === 'stripe' ? 'paid' : 'pending',
      file_path: invoiceFilePath,
    });

    return json({ success: true, invoiceId, invoiceFilePath });
  } catch (error) {
    console.error('bill-booking:', error);
    return json({ error: error.message }, 500);
  }
});
