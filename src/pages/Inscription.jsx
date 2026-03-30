import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, User, Mail, Lock, Phone, MapPin, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { createPageUrl } from '@/utils';

export default function Inscription() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    civilite: 'Mme',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    address: '',
    zipcode: '',
    city: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!formData.first_name.trim()) errors.first_name = 'Prénom requis';
    if (!formData.last_name.trim()) errors.last_name = 'Nom requis';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) errors.email = 'Email requis';
    else if (!emailRegex.test(formData.email)) errors.email = 'Format email invalide';

    const phoneClean = formData.phone.replace(/\s/g, '');
    if (!phoneClean) errors.phone = 'Téléphone requis';
    else if (!/^\d{10}$/.test(phoneClean)) errors.phone = 'Le téléphone doit comporter exactement 10 chiffres';

    if (!formData.address.trim()) errors.address = 'Adresse requise';
    if (!formData.zipcode.trim()) errors.zipcode = 'Code postal requis';
    if (!formData.city.trim()) errors.city = 'Ville requise';

    if (!formData.password) errors.password = 'Mot de passe requis';
    else if (formData.password.length < 6) errors.password = 'Au moins 6 caractères';

    if (formData.password !== formData.confirm_password) errors.confirm_password = 'Les mots de passe ne correspondent pas';

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await signup({
        civilite: formData.civilite,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.replace(/\s/g, ''),
        password: formData.password,
        address: formData.address.trim(),
        zipcode: formData.zipcode.trim(),
        city: formData.city.trim(),
        status: 'active',
      });
      navigate(createPageUrl('UserDashboard'));
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="min-h-screen bg-[#ECF5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <Link to={createPageUrl('Connexion')} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la connexion
        </Link>

        <Card className="shadow-lg border-none">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-[#B8D5C5] rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Créer mon compte</CardTitle>
              <CardDescription>Rejoignez Naky Ménage</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Civilité */}
              <div className="space-y-2">
                <Label>Civilité</Label>
                <div className="flex gap-3">
                  {['Mme', 'M'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => update('civilite', c)}
                      className={`flex-1 py-2 rounded-lg border-2 font-medium transition-all ${
                        formData.civilite === c
                          ? 'border-[#E95678] bg-[#E95678]/10 text-[#E95678]'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {c === 'Mme' ? 'Madame' : 'Monsieur'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Marie"
                      value={formData.first_name}
                      onChange={e => update('first_name', e.target.value)}
                      className={`pl-9 bg-[#F0F4F7] ${fieldErrors.first_name ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {fieldErrors.first_name && <p className="text-xs text-red-500">{fieldErrors.first_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Dupont"
                      value={formData.last_name}
                      onChange={e => update('last_name', e.target.value)}
                      className={`pl-9 bg-[#F0F4F7] ${fieldErrors.last_name ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {fieldErrors.last_name && <p className="text-xs text-red-500">{fieldErrors.last_name}</p>}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={formData.email}
                    onChange={e => update('email', e.target.value)}
                    className={`pl-9 bg-[#F0F4F7] ${fieldErrors.email ? 'border-red-400' : ''}`}
                  />
                </div>
                {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label>Téléphone * (10 chiffres)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="0612345678"
                    value={formData.phone}
                    onChange={e => update('phone', e.target.value)}
                    className={`pl-9 bg-[#F0F4F7] ${fieldErrors.phone ? 'border-red-400' : ''}`}
                  />
                </div>
                {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
              </div>

              {/* Adresse */}
              <div className="space-y-2">
                <Label>Adresse *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                  <Input
                    type="text"
                    placeholder="12 rue de la Paix"
                    value={formData.address}
                    onChange={e => update('address', e.target.value)}
                    className={`pl-9 bg-[#F0F4F7] ${fieldErrors.address ? 'border-red-400' : ''}`}
                  />
                </div>
                {fieldErrors.address && <p className="text-xs text-red-500">{fieldErrors.address}</p>}
              </div>

              {/* Code postal / Ville */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code postal *</Label>
                  <Input
                    placeholder="75001"
                    value={formData.zipcode}
                    onChange={e => update('zipcode', e.target.value)}
                    className={`bg-[#F0F4F7] ${fieldErrors.zipcode ? 'border-red-400' : ''}`}
                  />
                  {fieldErrors.zipcode && <p className="text-xs text-red-500">{fieldErrors.zipcode}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Ville *</Label>
                  <Input
                    placeholder="Paris"
                    value={formData.city}
                    onChange={e => update('city', e.target.value)}
                    className={`bg-[#F0F4F7] ${fieldErrors.city ? 'border-red-400' : ''}`}
                  />
                  {fieldErrors.city && <p className="text-xs text-red-500">{fieldErrors.city}</p>}
                </div>
              </div>

              {/* Mot de passe */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mot de passe *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={e => update('password', e.target.value)}
                      className={`pl-9 bg-[#F0F4F7] ${fieldErrors.password ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Confirmer *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirm_password}
                      onChange={e => update('confirm_password', e.target.value)}
                      className={`pl-9 bg-[#F0F4F7] ${fieldErrors.confirm_password ? 'border-red-400' : ''}`}
                    />
                  </div>
                  {fieldErrors.confirm_password && <p className="text-xs text-red-500">{fieldErrors.confirm_password}</p>}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E95678] hover:bg-[#d44565] text-white py-6 text-base mt-2"
              >
                {loading ? 'Création du compte...' : 'Créer mon compte'}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Déjà un compte ?{' '}
                <Link to={createPageUrl('Connexion')} className="text-[#E95678] font-medium hover:underline">
                  Se connecter
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}