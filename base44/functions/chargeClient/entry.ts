import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

// Charge a client for a booking using their saved payment method
// Payload: { bookingId: string }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return Response.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    // Fetch booking
    const bookings = await base44.asServiceRole.entities.Booking.filter({ id: bookingId });
    if (!bookings || bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }
    const booking = bookings[0];

    if (!booking.client_id) {
      return Response.json({ error: 'No client linked to this booking' }, { status: 400 });
    }

    if (!booking.total_price) {
      return Response.json({ error: 'Booking has no total_price' }, { status: 400 });
    }

    // Fetch client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: booking.client_id });
    if (!clients || clients.length === 0) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }
    const client = clients[0];

    if (!client.stripe_payment_method_id) {
      return Response.json({ error: 'No payment method saved for this client' }, { status: 400 });
    }

    const amountInCents = Math.round(booking.total_price * 100);

    // Create or reuse Stripe customer
    let customerId = client.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client.email,
        name: `${client.first_name} ${client.last_name}`,
        payment_method: client.stripe_payment_method_id,
      });
      customerId = customer.id;
      await base44.asServiceRole.entities.Client.update(client.id, { stripe_customer_id: customerId });
    }

    // Attach payment method to customer if not already
    await stripe.paymentMethods.attach(client.stripe_payment_method_id, { customer: customerId }).catch(() => {
      // Already attached - ignore error
    });

    // Create and confirm PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      customer: customerId,
      payment_method: client.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Naky - Ménage du ${booking.date} - ${client.first_name} ${client.last_name}`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        booking_id: bookingId,
        client_id: client.id,
      },
    });

    console.log(`Payment ${paymentIntent.id} succeeded for booking ${bookingId}, amount: ${booking.total_price}€`);

    // Mark booking as paid
    await base44.asServiceRole.entities.Booking.update(bookingId, { status: 'completed' });

    return Response.json({ success: true, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error('chargeClient error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});