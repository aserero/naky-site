import { supabase } from '@/lib/supabase';

// Upload d'un fichier vers Supabase Storage — remplace base44.integrations.Core.UploadFile.
// Retourne { path, publicUrl } (publicUrl null si le bucket est privé).
export async function uploadFile(bucket, file, folder = '') {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder ? folder + '/' : ''}${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data?.publicUrl ?? null };
}

// URL signée pour un fichier d'un bucket privé (1h par défaut)
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export const BUCKETS = {
  cvs: 'cvs',                    // CV candidatures (privé, upload public)
  employeeDocs: 'employee-docs', // documents employées (privé, admin)
  invoices: 'invoices',          // factures PDF (privé)
  photos: 'photos',              // photos de profil employées (public en lecture)
};
