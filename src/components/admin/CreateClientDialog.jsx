import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Lock, Phone, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCbMFCWZb-pNh1VXEByxcVWFNR0DQNaV08';

export default function CreateClientDialog({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
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
    advance_immediate: false,
  });

  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const initAutocomplete = () => {
      if (!window.google || !addressInputRef.current) return;
      if (autocompleteRef.current) return; // already initialized
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'fr' },
      });
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (!place.address_components) return;
        let street_number = '', route = '', zipcode = '', city = '';
        for (const comp of place.address_components) {
          if (comp.types.includes('street_number')) street_number = comp.long_name;
          if (comp.types.includes('route')) route = comp.long_name;
          if (comp.types.includes('postal_code')) zipcode = comp.long_name;
          if (comp.types.includes('locality')) city = comp.long_name;
        }
        setFormData(prev => ({
          ...prev,
          address: `${street_number} ${route}`.trim(),
          zipcode,
          city,
        }));
      });
    };

    // Use setTimeout to ensure DOM is rendered before attaching autocomplete
    const timer = setTimeout(() => {
      if (window.google) {
        initAutocomplete();
      } else {
        const existing = document.querySelector('script[data-gmaps]');
        if (!existing) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
          script.setAttribute('data-gmaps', 'true');
          script.onload = initAutocomplete;
          document.head.appendChild(script);
        } else {
          existing.addEventListener('load', initAutocomplete);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      autocompleteRef.current = null;
    };
  }, [open]);

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.first_name.trim()) errors.first_name = 'Requis';
    if (!formData.last_name.trim()) errors.last_name = 'Requis';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Email invalide';
    if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) errors.phone = '10 chiffres requis';
    if (!formData.address.trim()) errors.address = 'Requis';
    if (!formData.zipcode.trim()) errors.zipcode = 'Requis';
    if (!formData.city.trim()) errors.city = 'Requis';
    if (!formData.password || formData.password.length < 6) errors.password = 'Min. 6 caractères';
    if (formData.password !== formData.confirm_password) errors.confirm_password = 'Ne correspondent pas';
    return errors;
  };

  const handleSubmit = async () => {
    setError('');
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setLoading(true);
    try {
      await base44.entities.Client.create({
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
        urssaf_status: formData.advance_immediate ? 'pending' : 'none',
      });
      onCreated();
      onClose();
      setFormData({ civilite: 'Mme', first_name: '', last_name: '', email: '', phone: '', password: '', confirm_password: '', address: '', zipcode: '', city: '' });
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Créer un compte client</h2>
          <button onClick={onClose} className="rounded-sm opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Civilité */}
          <div className="space-y-2">
            <Label>Civilité</Label>
            <div className="flex gap-3">
              {['Mme', 'M'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update('civilite', c)}
                  className={`flex-1 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prénom *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Marie" value={formData.first_name} onChange={e => update('first_name', e.target.value)} className={`pl-9 ${fieldErrors.first_name ? 'border-red-400' : ''}`} />
              </div>
              {fieldErrors.first_name && <p className="text-xs text-red-500">{fieldErrors.first_name}</p>}
            </div>
            <div className="space-y-1">
              <Label>Nom *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Dupont" value={formData.last_name} onChange={e => update('last_name', e.target.value)} className={`pl-9 ${fieldErrors.last_name ? 'border-red-400' : ''}`} />
              </div>
              {fieldErrors.last_name && <p className="text-xs text-red-500">{fieldErrors.last_name}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label>Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input type="email" placeholder="votre@email.com" value={formData.email} onChange={e => update('email', e.target.value)} className={`pl-9 ${fieldErrors.email ? 'border-red-400' : ''}`} />
            </div>
            {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
          </div>

          {/* Téléphone */}
          <div className="space-y-1">
            <Label>Téléphone *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input type="tel" placeholder="0612345678" value={formData.phone} onChange={e => update('phone', e.target.value)} className={`pl-9 ${fieldErrors.phone ? 'border-red-400' : ''}`} />
            </div>
            {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
          </div>

          {/* Adresse Google Autocomplete */}
          <div className="space-y-1">
            <Label>Adresse *</Label>
            <Input
              ref={addressInputRef}
              type="text"
              placeholder="12 rue de la Paix"
              value={formData.address}
              onChange={e => update('address', e.target.value)}
              autoComplete="off"
              className={fieldErrors.address ? 'border-red-400' : ''}
            />
            {fieldErrors.address && <p className="text-xs text-red-500">{fieldErrors.address}</p>}
          </div>

          {/* CP / Ville */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Code postal *</Label>
              <Input placeholder="75001" value={formData.zipcode} onChange={e => update('zipcode', e.target.value)} className={fieldErrors.zipcode ? 'border-red-400' : ''} />
              {fieldErrors.zipcode && <p className="text-xs text-red-500">{fieldErrors.zipcode}</p>}
            </div>
            <div className="space-y-1">
              <Label>Ville *</Label>
              <Input placeholder="Paris" value={formData.city} onChange={e => update('city', e.target.value)} className={fieldErrors.city ? 'border-red-400' : ''} />
              {fieldErrors.city && <p className="text-xs text-red-500">{fieldErrors.city}</p>}
            </div>
          </div>

          {/* Avance immédiate URSSAF */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <Checkbox
              id="advance_immediate"
              checked={formData.advance_immediate}
              onCheckedChange={(checked) => update('advance_immediate', !!checked)}
            />
            <label htmlFor="advance_immediate" className="text-sm font-medium cursor-pointer">
              Le client souhaite l'avance immédiate URSSAF
            </label>
          </div>

          {/* Mot de passe */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mot de passe *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => update('password', e.target.value)} className={`pl-9 ${fieldErrors.password ? 'border-red-400' : ''}`} />
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
            </div>
            <div className="space-y-1">
              <Label>Confirmer *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input type="password" placeholder="••••••••" value={formData.confirm_password} onChange={e => update('confirm_password', e.target.value)} className={`pl-9 ${fieldErrors.confirm_password ? 'border-red-400' : ''}`} />
              </div>
              {fieldErrors.confirm_password && <p className="text-xs text-red-500">{fieldErrors.confirm_password}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#E95678] hover:bg-[#d44565] text-white">
            {loading ? 'Création...' : 'Créer le compte'}
          </Button>
        </div>
      </div>
    </div>
  );
}