const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('BOOKING_FROM_EMAIL') || 'contact@naky.fr';

    if (!resendApiKey) {
      return Response.json({ error: 'Missing RESEND_API_KEY secret' }, { status: 500, headers: corsHeaders });
    }

    const payload = (await req.json()) as EmailPayload;

    if (!payload?.to || !payload?.subject || !payload?.html) {
      return Response.json({ error: 'Missing email payload' }, { status: 400, headers: corsHeaders });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Naky <${fromEmail}>`,
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        reply_to: payload.replyTo || fromEmail,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return Response.json(
        { error: result?.message || 'Email sending failed', details: result },
        { status: 500, headers: corsHeaders },
      );
    }

    return Response.json({ success: true, result }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
