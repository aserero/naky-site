import { createClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return null;
}

// Client service-role (bypass RLS) — usage serveur uniquement
export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Résout l'utilisateur appelant depuis le JWT de la requête
export async function getCaller(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAdmin(req: Request) {
  const user = await getCaller(req);
  if (!user) return null;
  const svc = serviceClient();
  const { data } = await svc.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin' ? user : null;
}

// Envoi d'email via Resend
export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') ?? 'Naky <contact@naky.fr>';
  if (!apiKey) {
    console.warn(`RESEND_API_KEY absent — email non envoyé à ${to} (${subject})`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
}

export const SERVICE_LABELS: Record<string, string> = {
  regular: 'Ménage régulier',
  one_time: 'Ménage ponctuel',
  spring: 'Nettoyage de printemps',
  enterprise: 'Entreprise',
};

export function formatDateFr(dateStr?: string) {
  if (!dateStr) return 'Non définie';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function formatTimeFr(time?: string) {
  if (!time) return '';
  const [h, m] = time.split(':');
  return m === '00' ? `${parseInt(h, 10)}h` : `${parseInt(h, 10)}h${m}`;
}

export function formatDurationFr(minutes?: number) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
