import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MapPin, ShoppingBag, Clock, Info, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CartSummary({ bookingData, step, currentClient, onUpdate }) {
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingPrefs, setIsEditingPrefs] = useState(false);
  const [editedAddress, setEditedAddress] = useState({
    address: bookingData.address || '',
    zipcode: bookingData.zipcode || '',
    city: bookingData.city || ''
  });
  const [editedPrefs, setEditedPrefs] = useState({
    has_animals: bookingData.has_animals,
    advance_immediate: bookingData.advance_immediate
  });
  
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!isEditingAddress) return;

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
          
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          } else if (types.includes('route')) {
            route = component.long_name;
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('postal_town') && !city) {
            city = component.long_name;
          } else if (types.includes('postal_code')) {
            zipcode = component.long_name;
          }
        });

        const address = streetNumber ? `${streetNumber} ${route}` : route;

        if (addressInputRef.current && address) {
          addressInputRef.current.value = address;
        }

        setEditedAddress({
          address: address || '',
          city: city || '',
          zipcode: zipcode || ''
        });
      });
    };

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

    loadGoogleMapsScript();

    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isEditingAddress]);
  
  const getServiceLabel = (type) => {
    const types = {
      regular: "Ménage régulier",
      one_time: "Ménage ponctuel",
      spring: "Nettoyage de printemps",
      enterprise: "Entreprise"
    };
    return types[type] || type;
  };

  const getPrice = () => {
    let basePrice = 0;
    if (bookingData.service_type === 'regular') basePrice = 26;
    if (bookingData.service_type === 'one_time') basePrice = 29;
    if (bookingData.service_type === 'spring') basePrice = 32;
    
    const hours = bookingData.duration ? parseFloat(bookingData.duration.replace('h', '.')) : 0;
    return Math.round(basePrice * (hours || 0) * 100) / 100;
  };

  const handleSaveAddress = () => {
    if (onUpdate) {
      onUpdate(editedAddress);
    }
    setIsEditingAddress(false);
  };

  const handleSavePrefs = () => {
    if (onUpdate) {
      onUpdate(editedPrefs);
    }
    setIsEditingPrefs(false);
  };

  const price = getPrice();
  const shouldShowTaxCredit = currentClient?.urssaf_completed || bookingData.advance_immediate;
  const taxCredit = shouldShowTaxCredit ? Math.round(price * 0.5 * 100) / 100 : 0;
  const finalPrice = Math.round((price - taxCredit) * 100) / 100;

  return (
    <Card className="bg-white border-none shadow-xl rounded-2xl p-6 sticky top-24">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5" /> Mon panier
      </h2>

      <div className="space-y-6">
        {/* Address Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-green-700 font-medium">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Adresse
            </div>
            {currentClient && step === 9 && !isEditingAddress && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingAddress(true)} className="h-6 px-2">
                <Edit2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          {isEditingAddress ? (
            <div className="pl-6 space-y-2">
              <Input 
                ref={addressInputRef}
                value={editedAddress.address} 
                onChange={(e) => setEditedAddress({...editedAddress, address: e.target.value})}
                placeholder="Adresse"
                className="text-sm"
              />
              <div className="flex gap-2">
                <Input 
                  value={editedAddress.zipcode} 
                  onChange={(e) => setEditedAddress({...editedAddress, zipcode: e.target.value})}
                  placeholder="Code postal"
                  className="text-sm w-24"
                />
                <Input 
                  value={editedAddress.city} 
                  onChange={(e) => setEditedAddress({...editedAddress, city: e.target.value})}
                  placeholder="Ville"
                  className="text-sm flex-1"
                />
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSaveAddress} className="h-7 px-2 bg-green-600 hover:bg-green-700">
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingAddress(false)} className="h-7 px-2">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : bookingData.address ? (
            <div className="text-sm text-slate-600 pl-6">
              <p>{bookingData.address}</p>
              <p>{bookingData.zipcode} {bookingData.city}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 pl-6 italic">En attente...</p>
          )}
        </div>

        {/* Service Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <ShoppingBag className="w-4 h-4" /> Ménage
          </div>
          <div className="pl-6 space-y-3">
             <div className="flex justify-between text-sm">
                <span className="text-slate-600">{getServiceLabel(bookingData.service_type)}</span>
                {bookingData.service_type && <span className="font-medium text-slate-400">26€/h</span>}
             </div>
             {bookingData.has_animals && (
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Présence d'animaux</span>
                 </div>
             )}
             {bookingData.duration && (
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Durée: {bookingData.duration}</span>
                 </div>
             )}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Preferences Section */}
        {currentClient && step === 9 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-green-700 font-medium">
              <span className="text-sm">Préférences</span>
              {!isEditingPrefs && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingPrefs(true)} className="h-6 px-2">
                  <Edit2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingPrefs ? (
              <div className="pl-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_animals"
                    checked={editedPrefs.has_animals}
                    onCheckedChange={(checked) => setEditedPrefs({...editedPrefs, has_animals: checked})}
                  />
                  <Label htmlFor="edit_animals" className="text-xs cursor-pointer">J'ai des animaux</Label>
                </div>
                {!currentClient?.urssaf_completed && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit_urssaf"
                      checked={editedPrefs.advance_immediate}
                      onCheckedChange={(checked) => setEditedPrefs({...editedPrefs, advance_immediate: checked})}
                    />
                    <Label htmlFor="edit_urssaf" className="text-xs cursor-pointer">Avance immédiate URSSAF</Label>
                  </div>
                )}
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleSavePrefs} className="h-7 px-2 bg-green-600 hover:bg-green-700">
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingPrefs(false)} className="h-7 px-2">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pl-6 text-xs text-slate-600 space-y-1">
                <p>• {bookingData.has_animals ? 'Avec animaux' : 'Sans animaux'}</p>
                {!currentClient?.urssaf_completed && (
                  <p>• URSSAF: {bookingData.advance_immediate ? 'Oui' : 'Non'}</p>
                )}
              </div>
            )}
          </div>
        )}

        <hr className="border-slate-100" />

        {/* Pricing */}
        <div className="space-y-2">
            {shouldShowTaxCredit && price > 0 ? (
              <>
                <div className="flex justify-between text-sm text-slate-400">
                    <span>Prix total</span>
                    <span className="line-through">{price}€</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                    <span>Crédit d'impôt 50%</span>
                    <span>-{taxCredit}€</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#E95678] pt-2">
                    <span>Après crédit d'impôt</span>
                    <span>{finalPrice}€/session</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm font-bold pt-2">
                  <span>Total</span>
                  <span>{price > 0 ? `${price}€/session` : '0€/session'}</span>
              </div>
            )}
            <p className="text-[10px] text-right text-slate-400">Frais de service inclus.</p>
        </div>

        {/* Date Section */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <Clock className="w-4 h-4" /> Date
          </div>
          {bookingData.date ? (
            <div className="text-sm text-slate-600 pl-6">
              <p className="capitalize">
                {format(new Date(bookingData.date), 'EEEE d MMMM yyyy', { locale: fr })}
                {bookingData.time && `, à ${bookingData.time}`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 pl-6 italic">Choisir une date</p>
          )}
        </div>

      </div>
    </Card>
  );
}