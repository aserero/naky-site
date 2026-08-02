import Stripe from 'npm:stripe@14.21.0';
import { json, handleOptions, requireAdmin, serviceClient } from '../_shared/utils.ts';

// Prélève le client (off-session) pour une réservation — ADMIN uniquement.
// Payload : { bookingId }
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const admin = await requireAdmin(req);
    if (!admin) return json({ error: 'Accès refusé' }, 403);

    const { bookingId } = await req.json();
    if (!bookingId) return json({ error: 'bookingId manquant' }, 400);

    const svc = serviceClient();
    const { data: booking } = await svc.from('bookings').select('*').eq('id', bookingId).maybeSingle();
    if (!booking) return json({ error: 'Réservation introuvable' }, 404);
    if (!booking.client_id) return json({ error: 'Aucun client lié' }, 400);
    if (!booking.total_price) return json({ error: 'Pas de montant' }, 400);

    const { data: client } = await svc.from('clients').select('*').eq('id', booking.client_id).maybeSingle();
    if (!client) return json({ error: 'Client introuvable' }, 404);
    if (!client.stripe_payment_method_id) return json({ error: 'Aucune carte enregistrée pour ce client' }, 400);

    let customerId = client.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client.email,
        name: `${client.first_name} ${client.last_name}`,
        payment_method: client.stripe_payment_method_id,
      });
      customerId = customer.id;
      await svc.from('clients').update({ stripe_customer_id: customerId }).eq('id', client.id);
    }

    await stripe.paymentMethods
      .attach(client.stripe_payment_method_id, { customer: customerId })
      .catch(() => { /* déjà attachée */ });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.total_price * 100),
      currency: 'eur',
      customer: customerId,
      payment_method: client.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Naky - Ménage du ${booking.date} - ${client.first_name} ${client.last_name}`,
      metadata: { booking_id: bookingId, client_id: client.id },
    });

    await svc.from('bookings')
      .update({ status: 'completed', payment_method: 'stripe' })
      .eq('id', bookingId);

    return json({ success: true, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error('charge-client:', error);
    return json({ error: error.message }, 500);
  }
});
