import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

// Page d'atterrissage du lien "réinitialiser mon mot de passe" (email Supabase).
// La session de récupération est déjà active quand l'utilisateur arrive ici.
export default function NouveauMotDePasse() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('6 caractères minimum');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      toast.success('Mot de passe mis à jour !');
      navigate(createPageUrl('UserDashboard'));
    } catch (err) {
      setError(err.message || 'Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-slate-500 mb-6">Choisissez votre nouveau mot de passe Naky.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div>
            <Label htmlFor="confirm">Confirmer</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-[#E95678] hover:bg-[#d44565]">
            {loading ? 'Enregistrement…' : 'Valider'}
          </Button>
        </form>
      </div>
    </div>
  );
}
