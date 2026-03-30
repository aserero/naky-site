import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, ArrowLeft, Check } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import EnterpriseDialog from './EnterpriseDialog';
import QuickStripeStep from './QuickStripeStep';

export default function QuickBookingDialog({ open, onClose, client }) {
  const hasAddress = !!(client.address && client.zipcode && client.city);
  const [currentStep, setCurrentStep] = useState(1);
  const [sameAddress, setSameAddress] = useState(hasAddress);
  const [showEnterpriseDialog, setShowEnterpriseDialog] = useState(false);

  const urssafAlreadyHandled = client?.urssaf_completed || (client?.urssaf_status && client.urssaf_status !== 'none');
  const stripeAlreadyDone = !!client?.stripe_payment_method_id;

  const [formData, setFormData] = useState({
    address: client.address || '',
    zipcode: client.zipcode || '',
    city: client.city || '',
    service_type: 'regular',
    duration: '',
    date: null,
    time: '',
    recurrence: 'weekly',
    advance_immediate: urssafAlreadyHandled ? false : null
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

  const serviceTypes = [
    { id: 'regular', name: 'Ménage régulier', price: 26, discountedPrice: 13, benefits: ['Crédit d\'impôt 50%'] },
    { id: 'one_time', name: 'Ménage ponctuel', price: 29, discountedPrice: 14.5, benefits: ['Flexibilité totale', 'Sans engagement'] },
    { id: 'spring', name: 'Nettoyage de printemps', price: 32, discountedPrice: 16, benefits: ['Ménage en profondeur', 'Grands espaces'] },
    { id: 'enterprise', name: 'Entreprise', price: 0, discountedPrice: 0, benefits: ['Devis personnalisé', 'Facturation adaptée'] }
  ];
  const durations = ["2h", "2h30", "3h", "3h30", "4h", "4h30", "5h", "5h30", "6h", "7h"];
  const times = ["8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h", "20h"];
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
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDXEi8Z0g2vPu_-tQPl8JzZVVp0k3S3JTs&libraries=places&language=fr`;
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
    setLoading(true);

    try {
      // Confirm Stripe card if needed
      let paymentMethodId = client.stripe_payment_method_id;
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
        paymentMethodId = setupIntent.payment_method;
        await base44.entities.Client.update(client.id, {
          stripe_payment_method_id: paymentMethodId,
          stripe_customer_id: customerId,
        });
      }

      const totalPrice = calculatePrice();
      const booking = await base44.entities.Booking.create({
        client_id: client.id,
        address: (sameAddress && hasAddress) ? client.address : formData.address,
        zipcode: (sameAddress && hasAddress) ? client.zipcode : formData.zipcode,
        city: (sameAddress && hasAddress) ? client.city : formData.city,
        service_type: formData.service_type,
        duration: formData.duration,
        date: format(formData.date, 'yyyy-MM-dd'),
        time: formData.time,
        recurrence: formData.recurrence,
        status: 'pending',
        total_price: totalPrice,
        has_cleaning_supplies: true,
        advance_immediate: formData.advance_immediate === true,
        contact_details: {
          gender: client.civilite,
          first_name: client.first_name,
          last_name: client.last_name,
          phone: client.phone,
          email: client.email,
        }
      });

      // Cas 2 (depuis le dashboard) : NON à l'avance immédiate → envoyer webhook
      if (formData.advance_immediate === false && !client.idAbby) {
        base44.functions.invoke('sendUrssafWebhook', {
          clientId: client.id,
          action: 'create',
          formData: {
            civilite: client.civilite,
            first_name: client.first_name,
            last_name: client.last_name,
            nom_naissance: client.nom_naissance || client.last_name,
            birthdate: client.birthdate,
            pays_naissance: client.pays_naissance,
            zipcode_naissance: client.zipcode_naissance,
            email: client.email,
            phone: client.phone,
            iban: client.iban,
            bic: client.bic,
            account_holder: client.account_holder,
            numero_voie: client.numero_voie,
            lettre_voie: client.lettre_voie,
            type_voie: client.type_voie,
            nom_voie: client.nom_voie,
            lieu_dit: client.lieu_dit,
            complement_adresse: client.complement_adresse,
            pays: client.pays,
            address: client.address,
            zipcode: client.zipcode,
            city: client.city,
          }
        }).then(res => {
          if (res?.data?.idAbby) {
            base44.entities.Client.update(client.id, { idAbby: res.data.idAbby }).catch(console.error);
          }
        }).catch(err => console.error('URSSAF webhook error:', err));
      }

      try {
        await base44.functions.invoke('sendBookingNotification', { bookingId: booking.id });
      } catch (notifError) {
        console.log('Notification error:', notifError);
      }

      toast.success("Réservation créée avec succès !");
      onClose();
      if (formData.advance_immediate === true) {
        window.location.href = '/urssafform';
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

  const calculatePrice = () => {
    let rate = 26;
    if (formData.service_type === 'one_time') rate = 29;
    if (formData.service_type === 'spring') rate = 32;
    const hours = formData.duration ? parseFloat(formData.duration.replace('h', '.')) : 0;
    return Math.ceil(rate * hours * 100) / 100;
  };

  const nextStep = () => {
    if (currentStep === 1 && (!sameAddress || !hasAddress) && (!formData.address || !formData.zipcode || !formData.city)) {
      toast.error("Veuillez compléter l'adresse");
      return;
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
    if (currentStep === stepDuration && !formData.duration) {
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
                                   <div className="mt-2 flex items-baseline gap-2">
                                     <span className="text-[#E95678] line-through opacity-60 text-sm">{service.price}€/h</span>
                                     <span className="text-slate-700 font-semibold">{service.discountedPrice}€/h après crédit d'impôt</span>
                                   </div>
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
                      {durations.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFormData({ ...formData, duration: d })}
                          className={`p-4 rounded-xl font-semibold text-lg transition-all ${
                            formData.duration === d
                              ? 'bg-[#E95678] text-white'
                              : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {d}
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
                        disabled={(date) => date < addDays(new Date(), 2)}
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
                      {times.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, time: t })}
                          className={`p-3 rounded-lg font-medium transition-all ${
                            formData.time === t
                              ? 'bg-[#E95678] text-white'
                              : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {t}
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
                          {serviceTypes.find(s => s.id === formData.service_type)?.name}
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

                    {formData.duration && (
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-slate-500 mb-1">Durée</p>
                        <p className="font-medium">{formData.duration}</p>
                      </div>
                    )}

                    {formData.date && (
                      <div className="bg-white p-4 rounded-lg">
                        <p className="text-sm text-slate-500 mb-1">Date & Heure</p>
                        <p className="font-medium">
                          {format(formData.date, 'PPP', { locale: fr })}
                          {formData.time && ` à ${formData.time}`}
                        </p>
                      </div>
                    )}

                    {formData.duration && (
                      <div className="bg-[#E95678] text-white p-4 rounded-lg">
                        <p className="text-sm opacity-90 mb-1">Prix après crédit d'impôt (50%)</p>
                        <p className="text-3xl font-bold">{(calculatePrice() / 2).toFixed(2)}€</p>
                        <p className="text-xs mt-2 opacity-90 line-through">Prix total : {calculatePrice()}€</p>
                      </div>
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
                  disabled={loading || !formData.time || (!urssafAlreadyHandled && formData.advance_immediate === null) || (stepStripe && currentStep === stepStripe && !stripeData.cardComplete)}
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