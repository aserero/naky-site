import React, { useRef, useEffect, useState } from 'react';
import OutOfZoneDialog from './OutOfZoneDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Lock, Calendar } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { fr } from 'date-fns/locale';

export const StepAddress = ({ data, updateData, errors = {}, onOutOfZone }) => {
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const updateDataRef = useRef(updateData);
  const onOutOfZoneRef = useRef(onOutOfZone);
  const [showOutOfZoneDialog, setShowOutOfZoneDialog] = useState(false);
  const [addressValue, setAddressValue] = useState(data.address || '');

  // Garder les refs à jour sans re-trigger l'effect
  useEffect(() => {
    updateDataRef.current = updateData;
  }, [updateData]);

  useEffect(() => {
    onOutOfZoneRef.current = onOutOfZone;
  }, [onOutOfZone]);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google && window.google.maps) {
        initAutocomplete();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBexQfxSbrJ-UwNsu7Z2qPhUFzUCCCQzi0&libraries=places';
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    };

    const initAutocomplete = () => {
      if (!addressInputRef.current || !window.google) return;

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'fr' }
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (!place.address_components) return;

        let streetNumber = '';
        let route = '';
        let city = '';
        let zipcode = '';

        place.address_components.forEach(component => {
          const types = component.types;
          if (types.includes('street_number')) streetNumber = component.long_name;
          else if (types.includes('route')) route = component.long_name;
          else if (types.includes('locality')) city = component.long_name;
          else if (types.includes('postal_town') && !city) city = component.long_name;
          else if (types.includes('postal_code')) zipcode = component.long_name;
        });

        const address = streetNumber ? `${streetNumber} ${route}` : route;

        setAddressValue(address || '');
        // Utiliser la ref au lieu de la prop directement
        updateDataRef.current({
          address: address || '',
          city: city || '',
          zipcode: zipcode || ''
        });

        const allowedDepts = ['75', '92', '93', '94'];
        if (zipcode && !allowedDepts.some(d => zipcode.startsWith(d))) {
          setShowOutOfZoneDialog(true);
          if (onOutOfZoneRef.current) onOutOfZoneRef.current();
        }
      });
    };

    loadGoogleMapsScript();

    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Où aura lieu votre ménage ?</h2>
        <p className="text-slate-500">Votre adresse nous permet de trouver les agents les plus proches de chez vous.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Input 
            ref={addressInputRef}
            placeholder="Adresse *" 
            value={addressValue}
            onChange={(e) => {
              setAddressValue(e.target.value);
              updateData({ address: e.target.value });
            }}
            className={`h-12 bg-white ${errors.address ? 'border-red-500' : 'border-slate-200'}`}
          />
          {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Input 
              placeholder="Code Postal *" 
              value={data.zipcode} 
              onChange={(e) => updateData({ zipcode: e.target.value })}
              className={`h-12 bg-white ${errors.zipcode ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.zipcode && <p className="text-xs text-red-500">{errors.zipcode}</p>}
          </div>
          <div className="space-y-2">
            <Input 
              placeholder="Ville *" 
              value={data.city} 
              onChange={(e) => updateData({ city: e.target.value })}
              className={`h-12 bg-white ${errors.city ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
          </div>
        </div>
        <Input 
          placeholder="Complément d'adresse (étage, code, etc.)" 
          value={data.additional_address} 
          onChange={(e) => updateData({ additional_address: e.target.value })}
          className="h-12 bg-white border-slate-200"
        />
      </div>

      <OutOfZoneDialog
        open={showOutOfZoneDialog}
        onClose={() => setShowOutOfZoneDialog(false)}
        address={data.address}
        zipcode={data.zipcode}
        city={data.city}
      />
    </div>
  );
};

export const StepIdentity = ({ data, updateData, onLoginClick, errors = {} }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Création de votre compte Naky</h2>
      <p className="text-slate-500">Pour avoir la possibilité de bénéficier d'un crédit d'impôt de 50% sur votre ménage.</p>
    </div>

    <div className="bg-[#81C784]/20 border border-[#81C784] p-4 rounded-xl text-[#2E7D32] text-sm flex gap-3 items-center mb-6">
        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border border-current">i</div>
        <div>
            Si vous avez déjà un compte, <button onClick={onLoginClick} className="font-bold underline hover:text-[#1B5E20]">veuillez vous connecter</button>.
        </div>
    </div>

    <div className="space-y-4">
       <div>
         <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => updateData({ contact_details: { ...data.contact_details, gender: 'Madame' } })}
            className={`py-3 rounded-xl border font-medium ${data.contact_details?.gender === 'Madame' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : errors.gender ? 'bg-white border-red-500' : 'bg-white border-slate-200'}`}
          >
            Madame
          </button>
          <button
            onClick={() => updateData({ contact_details: { ...data.contact_details, gender: 'Monsieur' } })}
            className={`py-3 rounded-xl border font-medium ${data.contact_details?.gender === 'Monsieur' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : errors.gender ? 'bg-white border-red-500' : 'bg-white border-slate-200'}`}
          >
            Monsieur
          </button>
         </div>
         {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
       </div>

       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Input 
             placeholder="Prénom *" 
             value={data.contact_details?.first_name || ''} 
             onChange={(e) => updateData({ contact_details: { ...data.contact_details, first_name: e.target.value } })}
             className={`bg-white h-12 ${errors.first_name ? 'border-red-500' : 'border-slate-200'}`}
           />
           {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
         </div>
         <div className="space-y-2">
           <Input 
             placeholder="Nom *" 
             value={data.contact_details?.last_name || ''} 
             onChange={(e) => updateData({ contact_details: { ...data.contact_details, last_name: e.target.value } })}
             className={`bg-white h-12 ${errors.last_name ? 'border-red-500' : 'border-slate-200'}`}
           />
           {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
         </div>
       </div>

       <Input 
         placeholder="Pays" 
         defaultValue="France"
         className="bg-white border-slate-200 h-12"
         readOnly
       />
       
       <div className="space-y-2">
         <Input 
           placeholder="Téléphone *" 
           type="tel"
           value={data.contact_details?.phone || ''} 
           onChange={(e) => updateData({ contact_details: { ...data.contact_details, phone: e.target.value } })}
           className={`bg-white h-12 ${errors.phone ? 'border-red-500' : 'border-slate-200'}`}
         />
         {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
       </div>

       <div className="space-y-2">
         <Input 
           placeholder="Email *" 
           type="email"
           value={data.contact_details?.email || ''} 
           onChange={(e) => updateData({ contact_details: { ...data.contact_details, email: e.target.value } })}
           className={`bg-white h-12 ${errors.email ? 'border-red-500' : 'border-slate-200'}`}
         />
         {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
       </div>

       <div className="space-y-2">
         <Input 
           placeholder="Mot de passe *" 
           type="password"
           value={data.contact_details?.password || ''}
           onChange={(e) => updateData({ contact_details: { ...data.contact_details, password: e.target.value } })}
           className={`bg-white h-12 ${errors.password ? 'border-red-500' : 'border-slate-200'}`}
         />
         {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
       </div>
    </div>
  </div>
);

export const StepPayment = ({ data, updateData, errors = {} }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Dernières informations</h2>
        <p className="text-slate-500">Avant de finaliser votre réservation</p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <Textarea 
          placeholder="Instructions pour le ménage (codes d'accès, précisions...)" 
          value={data.instructions || ''} 
          onChange={(e) => updateData({ instructions: e.target.value })}
          className="bg-white border-slate-200 min-h-[100px]"
        />

        <div className={`flex items-start space-x-2 ${errors.has_cleaning_supplies ? 'text-red-500' : ''}`}>
          <Checkbox
            id="cleaning_supplies"
            checked={data.has_cleaning_supplies}
            onCheckedChange={(checked) => updateData({ has_cleaning_supplies: checked })}
          />
          <Label htmlFor="cleaning_supplies" className="cursor-pointer text-sm leading-tight">
            Je confirme avoir le matériel de nettoyage nécessaire (produits, aspirateur, serpillière, etc.)
          </Label>
        </div>
        {errors.has_cleaning_supplies && <p className="text-xs text-red-500">{errors.has_cleaning_supplies}</p>}
      </div>
    </div>
  );
};

export const StepDate = ({ data, updateData, errors = {} }) => {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Quelle date souhaitez-vous pour votre ménage ?</h2>
        <p className="text-slate-500">Disponible à partir de 2 jours ouvrés</p>
      </div>
      <div className={`flex justify-center bg-white p-4 rounded-2xl shadow-sm border ${errors.date ? 'border-red-500' : 'border-transparent'}`}>
        <CalendarComponent
          mode="single"
          selected={data.date ? new Date(data.date) : undefined}
          onSelect={(d) => d && updateData({ date: d.toISOString() })}
          locale={fr}
          disabled={(date) => date < minDate}
          className="rounded-md"
          classNames={{
              day_selected: "bg-[#E95678] text-white hover:bg-[#E95678] focus:bg-[#E95678]",
              day_today: "bg-slate-100 text-slate-900"
          }}
        />
      </div>
      {errors.date && <p className="text-center text-xs text-red-500">{errors.date}</p>}
    </div>
  );
};