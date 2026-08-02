import { supabase } from '@/lib/supabase';

// Appel d'une Edge Function Supabase — remplace base44.functions.invoke.
// Retourne directement le JSON de la fonction ; jette en cas d'erreur.
export async function invokeFunction(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = await error.context?.json?.();
      if (ctx?.error) message = ctx.error;
    } catch { /* garder le message par défaut */ }
    throw new Error(message);
  }
  return data;
}
