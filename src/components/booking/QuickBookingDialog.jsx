import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bookings, Clients } from '@/api/db';
import { invokeFunction } from '@/api/functions';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import EnterpriseDialog from './EnterpriseDialog';
import QuickStripeStep from './QuickStripeStep';
import {
  HOURLY_RATES, SERVICE_LABELS, CLIENT_DURATIONS_MIN, CLIENT_TIME_SLOTS,
  MIN_BOOKING_LEAD_DAYS, TAX_CREDIT_RATE, isZipAllowed, ZONE_LABEL,
  GOOGLE_MAPS_API_KEY, computePrice,
} from '@/lib/constants';
import { formatDuration, formatTime, formatPrice } from '@/lib/format';

export default function QuickBookingDialog({ open, onClose, client }) {
  const hasAddress = !!(client.address && client.zipcode && client.city);
  const [currentStep, setCurrentStep] = useState(1);
  const [sameAddress, setSameAddress] = useState(hasAddress);
  const [showEnterpriseDialog, setShowEnterpriseDialog] = useState(false);

  const urssafAlreadyHandled = client?.urssaf_completed || (client?.ai_status && client.ai_status !== 'none');
  const stripeAlreadyDone = !!client?.stripe_payment_method_id;

  const [formData, setFormData] = useState({
    address: client.address || '',
    zipcode: client.zipcode || '',
    city: client.city || '',
    service_type: 'regular',
    duration_minutes: null,
    date: null,
    start_time: '',
    recurrence: 'weekly',
    advance_immediate: urssafAlreadyHandled ? false : null,
    has_cleaning_supplies: false,
  });
  const [stripeData, setStripeData] = useState({ cardComplete: false });
  const stripeRefs = useRef({ stripe: null, card: null, clientSecret: null, customerId: null });
  const [loading, setLoading] = useState(false);
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const setFormDataRef = useRef(setFormData);
  const scrollRef = useRef(null);

  useEffect(() => {
    setFormDataRef.current = setFormData;
  }, [setFormData]);

  // Remise 50 % affichée seulement si avance immédiate choisie OU dossier URSSAF ok OU AI acceptée
  const showDiscount = formData.advance_immediate === true || client?.urssaf_completed || client?.ai_status === 'ai_accepted';

  const serviceTypes = [
    { id: 'regular', name: SERVICE_LABELS.regular, price: HOURLY_RATES.regular, benefits: ['Crédit d\'impôt 50%'] },
    { id: 'one_time', name: SERVICE_LABELS.one_time, price: HOURLY_RATES.one_time, benefits: ['Flexibilité totale', 'Sans engagement'] },
    { id: 'spring', name: SERVICE_LABELS.spring, price: HOURLY_RATES.spring, benefits: ['Ménage en profondeur', 'Grands espaces'] },
    { id: 'enterprise', name: SERVICE_LABELS.enterprise, price: 0, benefits: ['Devis personnalisé', 'Facturation adaptée'] }
  ];
  // Steps: 1=address, [2=urssaf?], N=service, N+1=duration, N+2=date, N+3=time, [last=stripe?]
  const totalSteps = (() => {
    let s = 5; // base: address, service, duration, date, time
    if (!urssafAlreadyHandled) s++;
    if (!stripeAlreadyDone) s++;
    return s;
  })();

  // Compute step numbers dynamically
  const stepUrssaf = urssafAlreadyHandled ? null : 2;
  const stepService = urssafAlreadyHandled ? 2 : 3;
  const stepDuration = stepService + 1;
  const stepDate = stepDuration + 1;
  const stepTime = stepDate + 1;
  const stepStripe = stripeAlreadyDone ? null : stepTime + 1;

  useEffect(() => {
    if (!sameAddress && open) {
      const loadGoogleMapsScript = () => {
        if (window.google && window.google.maps) {
          initAutocomplete();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=fr`;
        script.async = true;
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

          let streetNumber = '', route = '', city = '', zipcode = '';

          place.address_components.forEach(component => {
            const types = component.types;
            if (types.includes('street_number')) streetNumber = component.long_name;
            else if (types.includes('route')) route = component.long_name;
            else if (types.includes('locality')) city = component.long_name;
            else if (types.includes('postal_town') && !city) city = component.long_name;
            else if (types.includes('postal_code')) zipcode = component.long_name;
          });

          const address = streetNumber ? `${streetNumber} ${route}` : route;

          setFormDataRef.current(prev => ({
            ...prev,
            address: address || '',
            city: city || '',
            zipcode: zipcode || ''
          }));
        });
      };

      loadGoogleMapsScript();

      return () => {
        if (autocompleteRef.current && window.google) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    }
  }, [sameAddress, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.has_cleaning_supplies) {
      toast.error("Veuillez confirmer que vous disposez du matériel de nettoyage nécessaire");
      return;
    }

    setLoading(true);

    try {
      // Confirm Stripe card if needed
      if (!stripeAlreadyDone) {
        if (!stripeData.cardComplete) {
          toast.error("Veuillez compléter vos informations bancaires");
          setLoading(false);
          return;
        }
        const { stripe, card, clientSecret, customerId } = stripeRefs.current;
        if (!stripe || !card || !clientSecret) {
          toast.error("Le formulaire de paiement n'est pas encore prêt, veuillez réessayer");
          setLoading(false);
          return;
        }
        const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: { card }
        });
        if (stripeError) {
          toast.error(stripeError.message);
          setLoading(false);
          return;
        }
        await Clients.update(client.id, {
          stripe_payment_method_id: setupIntent.payment_method,
          stripe_customer_id: customerId,
        });
      }

      // Le client vient de demander l'avance immédiate pour la première fois → dossier en attente
      if (formData.advance_immediate === true && (!client.ai_status || client.ai_status === 'none')) {
        await Clients.update(client.id, { ai_status: 'pending' });
      }

      const booking = await Bookings.create({
        client_id: client.id,
        address: (sameAddress && hasAddress) ? client.address : formData.address,
        zipcode: (sameAddress && hasAddress) ? client.zipcode : formData.zipcode,
        city: (sameAddress && hasAddress) ? client.city : formData.city,
        service_type: formData.service_type,
        duration_minutes: formData.duration_minutes,
        date: format(formData.date, 'yyyy-MM-dd'),
        start_time: formData.start_time,
        recurrence: formData.service_type === 'regular' ? formData.recurrence : 'none',
        status: 'pending',
        hourly_rate: HOURLY_RATES[formData.service_type],
        total_price: computePrice(formData.service_type, formData.duration_minutes),
        has_animals: client.has_animals === true,
        has_cleaning_supplies: formData.has_cleaning_supplies === true,
        advance_immediate: formData.advance_immediate === true,
      });

      // Notification non bloquante
      invokeFunction('notify-booking', { bookingId: booking.id }).catch(err =>
        console.error('Notification error:', err)
      );

      toast.success("Réservation créée avec succès !");
      onClose();
      if (formData.advance_immediate === true) {
        window.location.href = createPageUrl('UrssafForm');
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error("Une erreur est survenue: " + (error.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const usingAlternativeAddress = !(sameAddress && hasAddress);

  const nextStep = () => {
    if (currentStep === 1 && usingAlternativeAddress) {
      if (!formData.address || !formData.zipcode || !formData.city) {
        toast.error("Veuillez compléter l'adresse");
        return;
      }
      if (!isZipAllowed(formData.zipcode)) {
        toast.error(`Nous n'intervenons que sur ${ZONE_LABEL}`);
        return;
      }
    }
    if (stepUrssaf && currentStep === stepUrssaf && formData.advance_immediate === null) {
      toast.error("Veuillez répondre à la question sur l'avance immédiate");
      return;
    }
    if (currentStep === stepService && !formData.service_type) {
      toast.error("Veuillez choisir un type de ménage");
      return;
    }
    if (currentStep === stepService && formData.service_type === 'regular' && !formData.recurrence) {
      toast.error("Veuillez choisir une fréquence");
      return;
    }
    if (currentStep === stepDuration && !formData.duration_minutes) {
      toast.error("Veuillez choisir une durée");
      return;
    }
    if (currentStep === stepDate && !formData.date) {
      toast.error("Veuillez choisir une date");
      return;
    }
    setCurrentStep(prev => prev + 1);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, 0);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, 0);
  };

  const totalPrice = computePrice(formData.service_type, formData.duration_minutes);

  return (
    <>
    <EnterpriseDialog
      open={showEnterpriseDialog}
      onClose={() => { setShowEnterpriseDialog(false); setFormData(f => ({ ...f, service_type: 'regular' })); }}
      onSuccess={() => { setShowEnterpriseDialog(false); onClose(); window.location.href = '/'; }}
    />
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b flex items-center gap-4">
            {currentStep > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={prevStep}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold">Nouvelle réservation</h2>
              <p className="text-sm text-slate-500">Étape {currentStep} sur {totalSteps}</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="grid md:grid-cols-2 gap-0 h-full">
              {/* Left: Form */}
              <div className="p-8">
                {/* Step URSSAF question (only if not already handled) */}
                {stepUrssaf && currentStep === stepUrssaf && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Souhaitez-vous l'avance immédiate ?</h3>
                      <p className="text-slate-500 text-sm">L'URSSAF prélèvera 50% du montant de vos sessions ménage.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, advance_immediate: true })}
                        className={`py-6 rounded-xl border-2 font-semibold text-lg transition-all ${formData.advance_immediate === true ? 'border-[#E95678] bg-[#E95678]/10 text-[#E95678]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, advance_immediate: false })}
                        className={`py-6 rounded-xl border-2 font-semibold text-lg transition-all ${formData.advance_immediate === false ? 'border-[#E95678] bg-[#E95678]/10 text-[#E95678]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        Non
                      </button>
                    </div>
                    {formData.advance_immediate === true && (
                      <div className="p-4 bg-[#FFF0F3] border border-[#E95678]/30 rounded-lg text-[#E95678] text-sm">
                        Vous serez redirigé vers le formulaire URSSAF après la réservation.
                      </div>
                    )}
                  </div>
                )}

              {/* Step 1: Address */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Où souhaitez-vous le ménage ?</h3>
                      <p className="text-slate-500 text-sm">Choisissez l'adresse de l'intervention</p>
                    </div>

                    {hasAddress && (
                      <>
                        <div className="flex items-start space-x-3 p-4 bg-[#ECF5F0] rounded-lg border-2 border-[#4A9B7F]">
                          <Checkbox
                            id="sameAddress"
                            checked={sameAddress}
                            onCheckedChange={setSameAddress}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label htmlFor="sameAddress" className="font-medium cursor-pointer block mb-1">
                              Utiliser mon adresse habituelle
                            </label>
                            <p className="text-sm text-slate-600">{client.address}, {client.zipcode} {client.city}</p>
                          </div>
                        </div>

                        <p className="text-sm text-slate-500 text-center">
                          Vous souhaitez faire le ménage à une autre adresse ?{' '}
                          <button
                            type="button"
                            onClick={() => setSameAddress(false)}
                            className="text-[#E95678] underline font-medium hover:text-[#d44565]"
                          >
                            Saisir une adresse différente
                          </button>
                        </p>
                      </>
                    )}
                    {!hasAddress && (
                      <p className="text-sm text-slate-500">Veuillez renseigner l'adresse de l'intervention.</p>
                    )}

                    {!sameAddress && (
                      <div className="space-y-4 p-4 bg-white border rounded-lg">
                        <div>
                          <label className="block text-sm font-medium mb-2">Adresse</label>
                          <Input
                            ref={addressInputRef}
                            placeholder="Ex: 12 rue de la Paix"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Code postal</label>
                            <Input
                              placeholder="75001"
                              value={formData.zipcode}
                              onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Ville</label>
                            <Input
                              placeholder="Paris"
                              value={formData.city}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">Nous intervenons sur {ZONE_LABEL}.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step Service Type */}
                {currentStep === stepService && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Type de ménage</h3>
                      <p className="text-slate-500 text-sm">Choisissez le service qui vous convient</p>
                    </div>

                    <div className="space-y-3">
                      {serviceTypes.map((service) => (
                        <div
                          key={service.id}
                          onClick={() => {
                            setFormData({ ...formData, service_type: service.id });
                            if (service.id === 'enterprise') setShowEnterpriseDialog(true);
                          }}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                             formData.service_type === service.id
                               ? 'border-[#E95678] bg-[#E95678]/5'
                               : 'border-slate-200 hover:border-slate-300'
                           }`}
                         >
                           <div className="flex items-start justify-between">
                             <div className="flex-1">
                                 <h4 className="font-semibold text-lg">{service.name}</h4>
                                 {service.price > 0 && (
                                   showDiscount ? (
                                     <div className="mt-2 flex items-baseline gap-2">
                                       <span className="text-[#E95678] line-through opacity-60 text-sm">{service.price}€/h</span>
                                       <span className="text-slate-700 font-semibold">{service.price * TAX_CREDIT_RATE}€/h après crédit d'impôt</span>
                                     </div>
                                   ) : (
                                     <div className="mt-2">
                                       <span className="text-slate-700 font-semibold">{service.price}€/h</span>
                                     </div>
                                   )
                                 )}
                              <ul className="mt-2 space-y-1">
                                {service.benefits.map((benefit, i) => (
                                  <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                                    <Check className="w-4 h-4 text-[#4A9B7F]" />
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {formData.service_type === service.id && (
                              <div className="w-6 h-6 rounded-full bg-[#E95678] flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {formData.service_type === 'regular' && (
                      <div className="space-y-3 p-4 bg-[#ECF5F0] rounded-lg">
                        <label className="block text-sm font-medium">Fréquence souhaitée</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'weekly', label: '1x/semaine' },
                            { value: 'twice_weekly', label: '2x/semaine' },
                            { value: 'biweekly', label: '1x/2 semaines' },
                            { value: 'monthly', label: '1x/mois' }
                          ].map((freq) => (
                            <button
                              key={freq.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, recurrence: freq.value })}
                              className={`p-3 rounded-lg font-medium transition-all ${
                                formData.recurrence === freq.value
                                  ? 'bg-[#E95678] text-white'
                                  : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              {freq.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step Duration */}
                {currentStep === stepDuration && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Durée du ménage</h3>
                      <p className="text-slate-500 text-sm">Combien de temps souhaitez-vous ?</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {CLIENT_DURATIONS_MIN.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFormData({ ...formData, duration_minutes: d })}
                          className={`p-4 rounded-xl font-semibold text-lg transition-all ${
                            formData.duration_minutes === d
                              ? 'bg-[#E95678] text-white'
                              : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {formatDuration(d)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step Date */}
                {currentStep === stepDate && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Quand souhaitez-vous le ménage ?</h3>
                      <p className="text-slate-500 text-sm">Choisissez la date de l'intervention</p>
                    </div>

                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(d) => setFormData({ ...formData, date: d })}
                        disabled={(date) => date < addDays(new Date(), MIN_BOOKING_LEAD_DAYS)}
                        locale={fr}
                        className="border rounded-lg"
                      />
                    </div>

                    {formData.date && (
                      <div className="p-4 bg-[#ECF5F0] rounded-lg text-center">
                        <p className="text-sm text-slate-600">Date sélectionnée</p>
                        <p className="font-semibold text-lg">{format(formData.date, 'PPPP', { locale: fr })}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step Time */}
                {currentStep === stepTime && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">À quelle heure ?</h3>
                      <p className="text-slate-500 text-sm">Sélectionnez l'horaire souhaité</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {CLIENT_TIME_SLOTS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, start_time: t })}
                          className={`p-3 rounded-lg font-medium transition-all ${
                            formData.start_time === t
                              ? 'bg-[#E95678] text-white'
                              : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {formatTime(t)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Step Stripe */}
                {stepStripe && currentStep === stepStripe && (
                  <QuickStripeStep
                    client={client}
                    stripeRefs={stripeRefs.current}
                    onUpdate={(val) => setStripeData(prev => ({ ...prev, ...val }))}
                  />
                )}

                {/* Confirmation matériel de nettoyage — sur la dernière étape */}
                {currentStep === totalSteps && (
                  <div className="mt-6 flex items-start space-x-2">
                    <Checkbox
                      id="quick_cleaning_supplies"
                      checked={formData.has_cleaning_supplies}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_cleaning_supplies: checked === true }))}
                    />
                    <Label htmlFor="quick_cleaning_supplies" className="cursor-pointer text-sm leading-tight">
                      Je confirme avoir le matériel de nettoyage nécessaire (produits, aspirateur, serpillière, etc.)
                    </Label>
                  </div>
                )}
              </div>

              {/* Right: Summary */}
              <div className="bg-[#ECF5F0] p-8 border-l">
                <div className="sticky top-8">
                  <h3 className="text-lg font-semibold mb-6">Récapitulatif</h3>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-slate-500 mb-1">Adresse</p>
                      <p className="font-medium">
                        {sameAddress && hasAddress ? (
                          `${client.address}, ${client.zipcode} ${client.city}`
                        ) : (
                          formData.address ? `${formData.address}, ${formData.zipcode} ${formData.city}` : 'Non renseignée'
                        )}
                      </p>
                    </div>

                    {formData.service_type && (
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-slate-500 mb-1">Type de ménage</p>
                        <p className="font-medium">
                          {SERVICE_LABELS[formData.service_type]}
                          {formData.service_type === 'regular' && formData.recurrence && (
                            <span className="text-sm text-slate-600"> • {
                              formData.recurrence === 'weekly' ? '1x/semaine' :
                              formData.recurrence === 'twice_weekly' ? '2x/semaine' :
                              formData.recurrence === 'biweekly' ? '1x/2 semaines' :
                              '1x/mois'
                            }</span>
                          )}
                        </p>
                      </div>
                    )}

                    {formData.duration_minutes && (
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-slate-500 mb-1">Durée</p>
                        <p className="font-medium">{formatDuration(formData.duration_minutes)}</p>
                      </div>
                    )}

                    {formData.date && (
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-slate-500 mb-1">Date & Heure</p>
                        <p className="font-medium">
                          {format(formData.date, 'PPP', { locale: fr })}
                          {formData.start_time && ` à ${formatTime(formData.start_time)}`}
                        </p>
                      </div>
                    )}

                    {formData.duration_minutes && (
                      showDiscount ? (
                        <div className="bg-[#E95678] text-white p-4 rounded-lg">
                          <p className="text-sm opacity-90 mb-1">Prix après crédit d'impôt (50%)</p>
                          <p className="text-3xl font-bold">{formatPrice(totalPrice * TAX_CREDIT_RATE)}</p>
                          <p className="text-xs mt-2 opacity-90 line-through">Prix total : {formatPrice(totalPrice)}</p>
                        </div>
                      ) : (
                        <div className="bg-[#E95678] text-white p-4 rounded-lg">
                          <p className="text-sm opacity-90 mb-1">Prix total</p>
                          <p className="text-3xl font-bold">{formatPrice(totalPrice)}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-6 bg-white">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Annuler
              </Button>
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 bg-[#E95678] hover:bg-[#d44565]"
                >
                  Continuer
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !formData.start_time || !formData.has_cleaning_supplies || (!urssafAlreadyHandled && formData.advance_immediate === null) || (stepStripe && currentStep === stepStripe && !stripeData.cardComplete)}
                  className="flex-1 bg-[#E95678] hover:bg-[#d44565]"
                >
                  {loading ? 'Création...' : 'Confirmer la réservation'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
