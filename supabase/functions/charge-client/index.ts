import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null;

function getAmountFromBooking(booking: Record<string, unknown>) {
  const rawAmount = booking.price_ht ?? booking.total_price;
  const amount = Number(rawAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return Math.round(amount * 100);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return Response.json(
        { error: 'Missing Supabase function secrets' },
        { status: 500, headers: corsHeaders },
      );
    }

    if (!stripe) {
      return Response.json(
        { error: 'Missing STRIPE_SECRET_KEY secret' },
        { status: 500, headers: corsHeaders },
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { data: actor, error: actorError } = await adminClient
      .from('clients')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (actorError || actor?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return Response.json({ error: 'Missing bookingId' }, { status: 400, headers: corsHeaders });
    }

    const { data: booking, error: bookingError } = await adminClient
      .from('reservations')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404, headers: corsHeaders });
    }

    if (!booking.client_id) {
      return Response.json(
        { error: 'No client linked to this booking' },
        { status: 400, headers: corsHeaders },
      );
    }

    const amount = getAmountFromBooking(booking as Record<string, unknown>);
    if (!amount) {
      return Response.json(
        { error: 'Booking has no valid amount' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: client, error: clientError } = await adminClient
      .from('clients')
      .select('*')
      .eq('id', booking.client_id)
      .maybeSingle();

    if (clientError || !client) {
      return Response.json({ error: 'Client not found' }, { status: 404, headers: corsHeaders });
    }

    if (!client.stripe_payment_method_id) {
      return Response.json(
        { error: 'No payment method saved for this client' },
        { status: 400, headers: corsHeaders },
      );
    }

    let customerId = client.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client.email || undefined,
        name: [client.first_name, client.last_name].filter(Boolean).join(' ') || undefined,
        payment_method: client.stripe_payment_method_id,
        metadata: {
          client_id: client.id,
          source: 'naky-supabase',
        },
      });
      customerId = customer.id;

      await adminClient
        .from('clients')
        .update({ stripe_customer_id: customerId })
        .eq('id', client.id);
    }

    await stripe.paymentMethods.attach(client.stripe_payment_method_id, {
      customer: customerId,
    }).catch(() => null);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      payment_method: client.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Naky - Reservation ${booking.ref || booking.id}`,
      metadata: {
        booking_id: booking.id,
        client_id: client.id,
        source: 'naky-supabase',
      },
    });

    const { error: updateError } = await adminClient
      .from('reservations')
      .update({
        payment_status: 'paid',
        stripe_payment_intent: paymentIntent.id,
      })
      .eq('id', booking.id);

    if (updateError) {
      return Response.json(
        { error: updateError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    return Response.json(
      {
        success: true,
        paymentIntentId: paymentIntent.id,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
