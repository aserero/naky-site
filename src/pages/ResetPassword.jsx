import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { createPageUrl } from '@/utils';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const initRecovery = async () => {
      const hash = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError && mounted) {
          setError("Le lien de réinitialisation est invalide ou expiré.");
        }

        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (mounted) {
        setReady(true);
      }
    };

    initRecovery();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Impossible d'enregistrer le nouveau mot de passe.");
      return;
    }

    setSuccess(true);
    window.setTimeout(() => {
      navigate(createPageUrl('Connexion'));
    }, 1600);
  };

  return (
    <div className="min-h-screen bg-[#ECF5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to={createPageUrl('Connexion')} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la connexion
        </Link>

        <Card className="shadow-lg border-none">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-[#B8D5C5] rounded-full flex items-center justify-center mx-auto">
              {success ? <CheckCircle className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">
                {success ? 'Mot de passe mis à jour' : 'Choisir un nouveau mot de passe'}
              </CardTitle>
              <CardDescription>
                {success
                  ? 'Redirection en cours vers la connexion.'
                  : 'Saisis ton nouveau mot de passe pour accéder à ton compte.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {!ready ? (
              <div className="text-center text-sm text-slate-500 py-6">Préparation du lien de réinitialisation...</div>
            ) : success ? (
              <Alert>
                <AlertDescription>Ton mot de passe a bien été mis à jour.</AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme ton mot de passe"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E95678] hover:bg-[#d44565] text-white py-6 text-base"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer mon nouveau mot de passe'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
