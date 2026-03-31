import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendTransactionalEmail } from '../_shared/emailProvider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatEuros(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
}

function renderReminderHtml({
  clientName,
  reference,
  serviceLabel,
  dateLabel,
  durationLabel,
  addressLabel,
  amount,
}: {
  clientName: string;
  reference: string;
  serviceLabel: string;
  dateLabel: string;
  durationLabel: string;
  addressLabel: string;
  amount: number;
}) {
  return `
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#102147;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#ffffff;border:1px solid #e1e8f0;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(16,33,71,0.08);">
          <div style="padding:28px 28px 18px;text-align:center;background:linear-gradient(180deg,#eef6ef 0%,#ffffff 100%);">
            <div style="font-size:34px;font-weight:700;letter-spacing:0.04em;color:#d7607d;">NAKY</div>
            <div style="margin-top:6px;font-size:13px;color:#6b7a90;">Nettoie en un clic.</div>
          </div>
          <div style="padding:8px 28px 32px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#48a953;">Rappel de rendez-vous</p>
            <h1 style="margin:0 0 16px;font-size:34px;line-height:1.05;font-weight:700;color:#102147;">Votre menage a lieu demain</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#5f718e;">${clientName}, nous vous rappelons que votre prestation Naky est prevue demain.</p>
            <div style="background:#f8fbfd;border:1px solid #e6edf4;border-radius:18px;padding:18px 20px;margin:0 0 14px;">
              <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Reference :</strong> ${reference}</p>
              <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Prestation :</strong> ${serviceLabel}</p>
              <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Date :</strong> ${dateLabel}</p>
              <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Duree :</strong> ${durationLabel}</p>
              <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Adresse :</strong> ${addressLabel}</p>
              <p style="margin:0;font-size:14px;color:#5f718e;"><strong>Montant :</strong> ${formatEuros(amount)}</p>
            </div>
            <div style="background:#f8fbfd;border:1px solid #e6edf4;border-radius:18px;padding:18px 20px;margin:0 0 14px;">
              <p style="margin:0;font-size:14px;color:#5f718e;">Pensez a laisser l'acces au logement et a preparer les informations utiles pour l'intervenant.</p>
            </div>
            <div style="margin:24px 0 18px;text-align:center;">
              <a href="https://naky-site.vercel.app/compte" style="display:inline-block;background:#d7607d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:999px;">Voir le detail</a>
            </div>
            <p style="margin:12px 0 0;font-size:13px;line-height:1.8;color:#8a9ab4;">Besoin d'aide ? Ecris-nous a contact@naky.fr.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json({ error: 'Missing function secrets' }, { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*, client:clients(*)')
      .gte('date', tomorrowStart.toISOString())
      .lte('date', tomorrowEnd.toISOString())
      .in('status', ['pending', 'confirmed']);

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    const serviceLabels: Record<string, string> = {
      regular: 'Menage regulier',
      one_time: 'Menage ponctuel',
      spring: 'Nettoyage de printemps',
      enterprise: 'Entretien entreprise',
    };

    const sentBookingIds: string[] = [];

    for (const reservation of reservations || []) {
      const client = reservation.client;
      if (!client?.email) continue;

      const reservationDate = reservation.date ? new Date(reservation.date) : null;
      const dateLabel = reservationDate
        ? new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }).format(reservationDate)
        : '—';
      const durationLabel = String(reservation.duration || '—').includes('h')
        ? String(reservation.duration)
        : `${reservation.duration || '—'}h`;
      const addressLabel = [reservation.address, reservation.cp, reservation.city].filter(Boolean).join(', ');

      try {
        await sendTransactionalEmail({
          to: client.email,
          subject: `Rappel : votre menage Naky a lieu demain - ${reservation.ref || reservation.id}`,
          html: renderReminderHtml({
            clientName: client.first_name || 'Bonjour',
            reference: reservation.ref || reservation.id,
            serviceLabel: serviceLabels[reservation.service_id] || 'Menage a domicile',
            dateLabel,
            durationLabel,
            addressLabel,
            amount: Number(reservation.price_ht || 0),
          }),
        });
        sentBookingIds.push(reservation.id);
      } catch (error) {
        console.error('Reminder email failed', {
          reservationId: reservation.id,
          clientEmail: client.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return Response.json(
      { success: true, sentCount: sentBookingIds.length, sentBookingIds },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
