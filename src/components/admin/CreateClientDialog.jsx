import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Phone, X, Building2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Clients } from '@/api/db';
import { GOOGLE_MAPS_API_KEY } from '@/lib/constants';
import { toast } from 'sonner';

const EMPTY_FORM = {
  client_type: 'b2c',
  company_name: '',
  siret: '',
  civilite: 'Mme',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  zipcode: '',
  city: '',
  advance_immediate: false,
};

export default function CreateClientDialog({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState(EMPTY_FORM);

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

  const isB2B = formData.client_type === 'b2b';

  const validate = () => {
    const errors = {};
    if (isB2B) {
      // B2B : seule la raison sociale est obligatoire ; le reste est valide s'il est rempli
      if (!formData.company_name.trim()) errors.company_name = 'Requis';
      if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Email invalide';
      if (formData.phone.trim() && !/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) errors.phone = '10 chiffres requis';
      return errors;
    }
    if (!formData.first_name.trim()) errors.first_name = 'Requis';
    if (!formData.last_name.trim()) errors.last_name = 'Requis';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Email invalide';
    if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) errors.phone = '10 chiffres requis';
    if (!formData.address.trim()) errors.address = 'Requis';
    if (!formData.zipcode.trim()) errors.zipcode = 'Requis';
    if (!formData.city.trim()) errors.city = 'Requis';
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
      // Fiche client sans compte auth (user_id null) : le client pourra créer
      // son compte plus tard avec le même email.
      await Clients.create({
        client_type: formData.client_type,
        company_name: isB2B ? formData.company_name.trim() : null,
        siret: isB2B ? (formData.siret.trim() || null) : null,
        civilite: isB2B ? null : formData.civilite,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim() ? formData.email.trim().toLowerCase() : null,
        phone: formData.phone.replace(/\s/g, '') || null,
        address: formData.address.trim() || null,
        zipcode: formData.zipcode.trim() || null,
        city: formData.city.trim() || null,
        status: 'active',
        ai_status: (!isB2B && formData.advance_immediate) ? 'pending' : 'none',
      });
      toast.success('Fiche client créée');
      onCreated();
      onClose();
      setFormData(EMPTY_FORM);
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
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-semibold">Créer une fiche client</h2>
          <button onClick={onClose} className="rounded-sm opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Aucun compte n'est créé : le client pourra créer son compte plus tard avec le même email.
        </p>

        <div className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Type de client */}
          <div className="space-y-2">
            <Label>Type de client</Label>
            <div className="flex gap-3">
              {[
                { key: 'b2c', label: 'Particulier (B2C)', icon: User },
                { key: 'b2b', label: 'Entreprise (B2B)', icon: Building2 },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update('client_type', key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                    formData.client_type === key
                      ? 'border-[#E95678] bg-[#E95678]/10 text-[#E95678]'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Société (B2B) */}
          {isB2B && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Raison sociale *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input placeholder="ACME SAS" value={formData.company_name} onChange={e => update('company_name', e.target.value)} className={`pl-9 ${fieldErrors.company_name ? 'border-red-400' : ''}`} />
                </div>
                {fieldErrors.company_name && <p className="text-xs text-red-500">{fieldErrors.company_name}</p>}
              </div>
              <div className="space-y-1">
                <Label>SIRET</Label>
                <Input placeholder="123 456 789 00012" value={formData.siret} onChange={e => update('siret', e.target.value)} />
              </div>
            </div>
          )}

          {/* Civilité */}
          {!isB2B && (
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
          )}

          {/* Prénom / Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isB2B ? 'Prénom du contact' : 'Prénom *'}</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Marie" value={formData.first_name} onChange={e => update('first_name', e.target.value)} className={`pl-9 ${fieldErrors.first_name ? 'border-red-400' : ''}`} />
              </div>
              {fieldErrors.first_name && <p className="text-xs text-red-500">{fieldErrors.first_name}</p>}
            </div>
            <div className="space-y-1">
              <Label>{isB2B ? 'Nom du contact' : 'Nom *'}</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Dupont" value={formData.last_name} onChange={e => update('last_name', e.target.value)} className={`pl-9 ${fieldErrors.last_name ? 'border-red-400' : ''}`} />
              </div>
              {fieldErrors.last_name && <p className="text-xs text-red-500">{fieldErrors.last_name}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label>Email {isB2B ? '' : '*'}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input type="email" placeholder="votre@email.com" value={formData.email} onChange={e => update('email', e.target.value)} className={`pl-9 ${fieldErrors.email ? 'border-red-400' : ''}`} />
            </div>
            {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
          </div>

          {/* Téléphone */}
          <div className="space-y-1">
            <Label>Téléphone {isB2B ? '' : '*'}</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input type="tel" placeholder="0612345678" value={formData.phone} onChange={e => update('phone', e.target.value)} className={`pl-9 ${fieldErrors.phone ? 'border-red-400' : ''}`} />
            </div>
            {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
          </div>

          {/* Adresse Google Autocomplete */}
          <div className="space-y-1">
            <Label>{isB2B ? 'Adresse de la société' : 'Adresse *'}</Label>
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
              <Label>Code postal {isB2B ? '' : '*'}</Label>
              <Input placeholder="75001" value={formData.zipcode} onChange={e => update('zipcode', e.target.value)} className={fieldErrors.zipcode ? 'border-red-400' : ''} />
              {fieldErrors.zipcode && <p className="text-xs text-red-500">{fieldErrors.zipcode}</p>}
            </div>
            <div className="space-y-1">
              <Label>Ville {isB2B ? '' : '*'}</Label>
              <Input placeholder="Paris" value={formData.city} onChange={e => update('city', e.target.value)} className={fieldErrors.city ? 'border-red-400' : ''} />
              {fieldErrors.city && <p className="text-xs text-red-500">{fieldErrors.city}</p>}
            </div>
          </div>

          {/* Avance immédiate URSSAF — particuliers uniquement */}
          {!isB2B && (
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
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#E95678] hover:bg-[#d44565] text-white">
            {loading ? 'Création...' : 'Créer la fiche'}
          </Button>
        </div>
      </div>
    </div>
  );
}
