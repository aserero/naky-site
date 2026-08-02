import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, ArrowLeft, Mail, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { createPageUrl } from '@/utils';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      await resetPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(err.message || 'Une erreur est survenue.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(createPageUrl('UserDashboard'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ECF5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à l'accueil
        </Link>

        <Card className="shadow-lg border-none">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-[#B8D5C5] rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Bienvenue sur Naky Ménage</CardTitle>
              <CardDescription>Connectez-vous pour continuer</CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-[#F0F4F7]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 bg-[#F0F4F7]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E95678] hover:bg-[#d44565] text-white py-6 text-base"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>

              <div className="text-center space-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                  className="text-slate-500 hover:text-[#E95678] underline"
                >
                  Mot de passe oublié ?
                </button>
                <p className="text-slate-600">
                  Pas encore de compte ?{' '}
                  <Link to={createPageUrl('Inscription')} className="text-[#E95678] font-medium hover:underline">
                    Créer un compte
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Modal mot de passe oublié */}
        {showForgot && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              {forgotSuccess ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-900">Demande envoyée</h3>
                  <p className="text-slate-600 text-sm">Si un compte existe avec cet email, un email de réinitialisation a été envoyé.</p>
                  <Button className="w-full bg-[#E95678] hover:bg-[#d44565] text-white" onClick={() => { setShowForgot(false); setForgotSuccess(false); }}>
                    Fermer
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Mot de passe oublié</h3>
                  <p className="text-slate-600 text-sm mb-4">Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    {forgotError && (
                      <Alert variant="destructive"><AlertDescription>{forgotError}</AlertDescription></Alert>
                    )}
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="votre@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="pl-10 bg-[#F0F4F7]"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForgot(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={forgotLoading} className="flex-1 bg-[#E95678] hover:bg-[#d44565] text-white">
                        {forgotLoading ? 'Envoi...' : 'Envoyer'}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}