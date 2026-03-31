type EmailAddress = string | string[] | undefined;

export type TransactionalEmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  text?: string;
};

function toArray(value: EmailAddress) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function base64UrlEncode(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function buildMimeMessage({
  from,
  to,
  cc,
  bcc,
  replyTo,
  subject,
  html,
  text,
}: {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const boundary = `naky_${crypto.randomUUID()}`;
  const lines = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    ...(cc && cc.length ? [`Cc: ${cc.join(', ')}`] : []),
    ...(bcc && bcc.length ? [`Bcc: ${bcc.join(', ')}`] : []),
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text || stripHtml(html),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${boundary}--`,
    '',
  ];

  return lines.join('\r\n');
}

async function getGmailAccessToken() {
  const clientId = Deno.env.get('GMAIL_CLIENT_ID');
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    const details = tokenPayload?.error_description || tokenPayload?.error || 'Failed to refresh Gmail access token';
    throw new Error(details);
  }

  return tokenPayload.access_token as string;
}

async function sendWithGmail(payload: TransactionalEmailPayload) {
  const accessToken = await getGmailAccessToken();
  if (!accessToken) {
    return null;
  }

  const senderEmail = Deno.env.get('GMAIL_SENDER_EMAIL') || Deno.env.get('BOOKING_FROM_EMAIL') || 'contact@naky.fr';
  const senderName = Deno.env.get('GMAIL_SENDER_NAME') || 'Naky';
  const from = `${senderName} <${senderEmail}>`;

  const mimeMessage = buildMimeMessage({
    from,
    to: toArray(payload.to),
    cc: toArray(payload.cc),
    bcc: toArray(payload.bcc),
    replyTo: payload.replyTo || senderEmail,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64UrlEncode(mimeMessage),
    }),
  });

  const gmailPayload = await gmailResponse.json().catch(() => ({}));
  if (!gmailResponse.ok) {
    const details = gmailPayload?.error?.message || gmailPayload?.error_description || 'Gmail API send failed';
    throw new Error(details);
  }

  return {
    provider: 'gmail',
    result: gmailPayload,
  };
}

async function sendWithResend(payload: TransactionalEmailPayload) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('BOOKING_FROM_EMAIL') || 'contact@naky.fr';

  if (!resendApiKey) {
    throw new Error('Missing Gmail credentials and RESEND_API_KEY secret');
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
      text: payload.text,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = result?.message || result?.error || 'Resend send failed';
    throw new Error(details);
  }

  return {
    provider: 'resend',
    result,
  };
}

export async function sendTransactionalEmail(payload: TransactionalEmailPayload) {
  const gmailResult = await sendWithGmail(payload);
  if (gmailResult) {
    return gmailResult;
  }
  return sendWithResend(payload);
}
