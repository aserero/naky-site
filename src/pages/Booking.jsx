import React, { useState, useEffect } from 'react';
import { Bookings, Clients } from '@/api/db';
import { invokeFunction } from '@/api/functions';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CartSummary from '../components/booking/CartSummary';
import { ArrowLeft, CheckCircle2, Home, Clock, Sparkles, Building2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { StepAddress, StepIdentity, StepDate } from '@/components/booking/BookingSteps';
import StepStripeCard from '@/components/booking/StepStripeCard';
import EnterpriseDialog from '@/components/booking/EnterpriseDialog';
import { useAuth } from '@/components/AuthContext';
import { HOURLY_RATES, TAX_CREDIT_RATE, CLIENT_DURATIONS_MIN, CLIENT_TIME_SLOTS, isZipAllowed, ZONE_LABEL, computePrice } from '@/lib/constants';
import { formatDuration, formatTime } from '@/lib/format';

// --- Step Components ---

// StepAddress imported

const StepAdvance = ({ data, updateData }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Souhaitez-vous bénéficier de l'avance immédiate ?</h2>
      <p className="text-slate-500">L'URSSAF prélèvera sur ce compte 50% du montant de vos sessions ménage.</p>
    </div>
    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
      <button
        onClick={() => updateData({ advance_immediate: true })}
        className={`h-16 rounded-xl border-2 transition-all font-medium ${data.advance_immediate === true ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        Oui
      </button>
      <button
        onClick={() => updateData({ advance_immediate: false })}
        className={`h-16 rounded-xl border-2 transition-all font-medium ${data.advance_immediate === false ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        Non
      </button>
    </div>
    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-blue-800 text-sm mt-4 max-w-md mx-auto">
      <p className="font-semibold mb-1">Le saviez-vous ?</p>
      <p>Avec Naky, l'État paie 50% de votre ménage grâce au crédit d'impôt pour les services à la personne. Vous ne payez que la moitié et l'État paie le reste !</p>
    </div>
    {data.advance_immediate === true && (
      <div className="bg-[#FFF0F3] p-4 rounded-lg text-[#E95678] text-sm flex gap-3 items-start mt-2">
        <div className="mt-0.5"><InfoIcon /></div>
        <p>Vous serez redirigé vers le formulaire d'inscription à l'URSSAF après avoir confirmé votre réservation.</p>
      </div>
    )}
  </div>
);

const ServiceCard = ({ icon: Icon, title, fullPrice, discountedPrice, active, onClick, showDiscount }) => (
  <div
    onClick={onClick}
    className={`p-6 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 bg-white ${active ? 'border-[#E95678] ring-1 ring-[#E95678] bg-[#FFF0F3]' : 'border-slate-100 hover:border-[#E95678]/30 shadow-sm'}`}
  >
    <div className={`p-3 rounded-full ${active ? 'bg-[#E95678] text-white' : 'bg-[#ECF5F0] text-[#4CAF50]'}`}>
      <Icon className="w-8 h-8" />
    </div>
    <div className="flex-1">
      <h3 className="font-bold text-slate-900">{title}</h3>
      {fullPrice && discountedPrice && showDiscount && (
        <div className="mt-2 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[#E95678] line-through opacity-60 text-sm">{fullPrice}€/h</span>
            <span className="text-slate-700 font-semibold">{discountedPrice}€/h après crédit d'impôt</span>
          </div>
          <p className="text-xs text-slate-500">soit {fullPrice}€/h avant le crédit d'impôt</p>
        </div>
      )}
      {fullPrice && !showDiscount && (
        <div className="mt-2">
          <span className="text-slate-700 font-semibold">{fullPrice}€/h</span>
        </div>
      )}

      {active && (
        <div className="mt-3 space-y-1">
           <div className="flex items-center text-xs text-slate-500 gap-2">
             <CheckCircle2 className="w-3 h-3 text-[#4CAF50]" /> Horaires flexibles
           </div>
           <div className="flex items-center text-xs text-slate-500 gap-2">
             <CheckCircle2 className="w-3 h-3 text-[#4CAF50]" /> Sans engagement
           </div>
           <div className="flex items-center text-xs text-slate-500 gap-2">
             <CheckCircle2 className="w-3 h-3 text-[#4CAF50]" /> 50% d'avance immédiate
           </div>
        </div>
      )}
    </div>
  </div>
);

const StepService = ({ data, updateData, onEnterpriseSelect }) => {
  const showDiscount = data.advance_immediate === true;
  return (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Choisissez votre ménage en un clic</h2>
      <p className="text-slate-500">Sélectionnez le service qui correspond à vos besoins</p>
    </div>
    <div className="space-y-4">
      <ServiceCard
        icon={Sparkles}
        title="Ménage régulier classique"
        fullPrice={HOURLY_RATES.regular}
        discountedPrice={HOURLY_RATES.regular * TAX_CREDIT_RATE}
        showDiscount={showDiscount}
        active={data.service_type === 'regular'}
        onClick={() => updateData({ service_type: 'regular', recurrence: data.recurrence || 'weekly' })}
      />
      <ServiceCard
        icon={Clock}
        title="Ménage ponctuel classique"
        fullPrice={HOURLY_RATES.one_time}
        discountedPrice={HOURLY_RATES.one_time * TAX_CREDIT_RATE}
        showDiscount={showDiscount}
        active={data.service_type === 'one_time'}
        onClick={() => updateData({ service_type: 'one_time', recurrence: 'none' })}
      />
      <ServiceCard
        icon={Home}
        title="Nettoyage de printemps"
        fullPrice={HOURLY_RATES.spring}
        discountedPrice={HOURLY_RATES.spring * TAX_CREDIT_RATE}
        showDiscount={showDiscount}
        active={data.service_type === 'spring'}
        onClick={() => updateData({ service_type: 'spring', recurrence: 'none' })}
      />
       <ServiceCard
        icon={Building2}
        title="Entreprise"
        active={data.service_type === 'enterprise'}
        onClick={() => { updateData({ service_type: 'enterprise', recurrence: 'none' }); onEnterpriseSelect(); }}
      />
    </div>
  </div>
  );
};

const StepFrequency = ({ data, updateData }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">À quelle fréquence ?</h2>
      <p className="text-slate-500">Choisissez la fréquence de vos ménages réguliers</p>
    </div>
    <div className="space-y-4 max-w-md mx-auto">
      <button
        onClick={() => updateData({ recurrence: 'weekly' })}
        className={`w-full py-4 rounded-xl border-2 transition-all font-medium relative ${data.recurrence === 'weekly' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        <span>1 fois par semaine</span>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs bg-[#E95678] text-white px-3 py-1 rounded-full">
          Populaire
        </span>
      </button>
      <button
        onClick={() => updateData({ recurrence: 'twice_weekly' })}
        className={`w-full py-4 rounded-xl border-2 transition-all font-medium ${data.recurrence === 'twice_weekly' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        2 fois par semaine
      </button>
      <button
        onClick={() => updateData({ recurrence: 'biweekly' })}
        className={`w-full py-4 rounded-xl border-2 transition-all font-medium ${data.recurrence === 'biweekly' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        1 fois toutes les deux semaines
      </button>
      <button
        onClick={() => updateData({ recurrence: 'monthly' })}
        className={`w-full py-4 rounded-xl border-2 transition-all font-medium ${data.recurrence === 'monthly' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        1 fois par mois
      </button>
    </div>
    <p className="text-center text-slate-500 text-sm mt-6">* Appelez-nous si vous voulez choisir une autre fréquence</p>
  </div>
);

const StepAnimals = ({ data, updateData }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Possédez-vous des animaux ?</h2>
    </div>
    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
      <button
        onClick={() => updateData({ has_animals: true })}
        className={`h-16 rounded-xl border-2 transition-all font-medium ${data.has_animals === true ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        Oui
      </button>
      <button
        onClick={() => updateData({ has_animals: false })}
        className={`h-16 rounded-xl border-2 transition-all font-medium ${data.has_animals === false ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        Non
      </button>
    </div>
  </div>
);

const StepDuration = ({ data, updateData }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Choisissez la durée de votre ménage</h2>
      <p className="text-slate-500">Confirmation reçue sous 24h</p>
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {CLIENT_DURATIONS_MIN.map(d => (
        <button
          key={d}
          onClick={() => updateData({ duration_minutes: d })}
          className={`py-3 rounded-xl border transition-all font-medium ${data.duration_minutes === d ? 'border-[#E95678] bg-white ring-2 ring-[#E95678] text-[#E95678]' : 'border-white bg-white hover:bg-slate-50'}`}
        >
          {formatDuration(d)}
        </button>
      ))}
    </div>
  </div>
);

const StepTime = ({ data, updateData }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Quel horaire pour votre ménage ?</h2>
      <p className="text-slate-500">Sélectionnez votre créneau horaire</p>
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
      {CLIENT_TIME_SLOTS.map(t => (
        <button
          key={t}
          onClick={() => updateData({ start_time: t })}
          className={`py-3 rounded-xl border transition-all font-medium ${data.start_time === t ? 'border-[#E95678] bg-white ring-2 ring-[#E95678] text-[#E95678]' : 'border-white bg-white hover:bg-slate-50'}`}
        >
          {formatTime(t)}
        </button>
      ))}
    </div>
  </div>
);

// --- Main Page Component ---

const InfoIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
);

export default function BookingPage() {
  const { currentClient, signup, updateClient } = useAuth();
  const [step, setStep] = useState(1);
  const [showEnterpriseDialog, setShowEnterpriseDialog] = useState(false);
  const [showEnterpriseThanks, setShowEnterpriseThanks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [stripeSetupInfo, setStripeSetupInfo] = useState(null);
  const [bookingData, setBookingData] = useState({
    address: '',
    zipcode: '',
    city: '',
    additional_address: '',
    advance_immediate: null,
    service_type: '',
    recurrence: '',
    has_animals: null,
    duration_minutes: null,
    date: '',
    start_time: '',
    instructions: '',
    has_cleaning_supplies: false,
    contact_details: {
      gender: '',
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: ''
    }
  });

  const [isLoaded, setIsLoaded] = useState(false);

  const urssafAlreadyHandled = currentClient?.urssaf_completed || (currentClient?.ai_status && currentClient.ai_status !== 'none');

  // Check for saved state on mount and prefill for logged-in users
  useEffect(() => {
    if (!currentClient) {
      // User not logged in - clear any saved state and start fresh
      localStorage.removeItem('naky_booking_state');
      setIsLoaded(true);
      return;
    }

    // User is logged in - start at step 2 (or 3 if URSSAF already handled)
    const alreadyHandled = currentClient.urssaf_completed || (currentClient.ai_status && currentClient.ai_status !== 'none');

    // Try to restore saved state
    const saved = localStorage.getItem('naky_booking_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBookingData(parsed.data);
        setStep(parsed.step);
      } catch (e) {
        // If parsing fails, prefill with client data
        setBookingData(prev => ({
          ...prev,
          address: currentClient.address || prev.address,
          zipcode: currentClient.zipcode || prev.zipcode,
          city: currentClient.city || prev.city,
          has_animals: currentClient.has_animals !== undefined ? currentClient.has_animals : prev.has_animals,
          advance_immediate: currentClient.urssaf_completed ? false : prev.advance_immediate
        }));
        setStep(alreadyHandled ? 3 : 2);
      }
    } else {
      // No saved state - prefill with client data and go to step 2 or 3
      setBookingData(prev => ({
        ...prev,
        address: currentClient.address || prev.address,
        zipcode: currentClient.zipcode || prev.zipcode,
        city: currentClient.city || prev.city,
        has_animals: currentClient.has_animals !== undefined ? currentClient.has_animals : prev.has_animals,
        advance_immediate: currentClient.urssaf_completed ? false : prev.advance_immediate
      }));
      setStep(alreadyHandled ? 3 : 2);
    }

    setIsLoaded(true);
  }, [currentClient]);

  // Save state on change - only for logged-in users
  useEffect(() => {
    if (isLoaded && currentClient) {
      const { contact_details, _stripeInstance, _stripeCard, _cardComplete, ...persistable } = bookingData;
      localStorage.setItem('naky_booking_state', JSON.stringify({ data: { ...persistable, contact_details: { gender: '', first_name: '', last_name: '', phone: '', email: '', password: '' } }, step }));
    }
  }, [bookingData, step, isLoaded, currentClient]);

  // Scroll to top on every step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const updateData = (newData) => {
    setBookingData(prev => ({ ...prev, ...newData }));
    setErrors({}); // Clear errors on change
  };

  const validateStep = (currentStep) => {
    const newErrors = {};

    // Skip address validation for logged-in users
    if (currentStep === 1 && !currentClient) {
      if (!bookingData.address) newErrors.address = "L'adresse est obligatoire";
      if (!bookingData.zipcode) newErrors.zipcode = "Le code postal est obligatoire";
      if (!bookingData.city) newErrors.city = "La ville est obligatoire";
      if (bookingData.zipcode && !isZipAllowed(bookingData.zipcode)) {
        newErrors.zipcode = `Nous n'intervenons que sur ${ZONE_LABEL}`;
      }
    }

    // Skip URSSAF question for users who already made a choice (completed or pending)
    if (currentStep === 2 && !urssafAlreadyHandled) {
      if (bookingData.advance_immediate === null) newErrors.advance_immediate = "Veuillez faire un choix";
    }

    if (currentStep === 4 && bookingData.service_type === 'regular') {
      if (!bookingData.recurrence || bookingData.recurrence === 'none') {
        newErrors.recurrence = "Veuillez choisir une fréquence";
      }
    }

    // Skip animals question for logged-in users (already in profile)
    if ((currentStep === 5 && bookingData.service_type === 'regular' && !currentClient) ||
        (currentStep === 4 && bookingData.service_type !== 'regular' && !currentClient)) {
      if (bookingData.has_animals === null) newErrors.has_animals = "Veuillez faire un choix";
    }

    // Duration validation
    if (currentClient) {
      if (currentStep === 5) {
        if (!bookingData.duration_minutes) newErrors.duration_minutes = "Veuillez choisir une durée";
      }
    } else {
      if ((currentStep === 6 && bookingData.service_type === 'regular') || (currentStep === 5 && bookingData.service_type !== 'regular')) {
        if (!bookingData.duration_minutes) newErrors.duration_minutes = "Veuillez choisir une durée";
      }
    }

    // Date validation
    if (currentClient) {
      if (currentStep === 6) {
        if (!bookingData.date) newErrors.date = "Veuillez sélectionner une date";
      }
    } else {
      if ((currentStep === 7 && bookingData.service_type === 'regular') || (currentStep === 6 && bookingData.service_type !== 'regular')) {
        if (!bookingData.date) newErrors.date = "Veuillez sélectionner une date";
      }
    }

    // Time validation
    if (currentClient) {
      if (currentStep === 7) {
        if (!bookingData.start_time) newErrors.start_time = "Veuillez sélectionner un horaire";
      }
    } else {
      if ((currentStep === 8 && bookingData.service_type === 'regular') || (currentStep === 7 && bookingData.service_type !== 'regular')) {
        if (!bookingData.start_time) newErrors.start_time = "Veuillez sélectionner un horaire";
      }
    }

    // Service type validation
    if (currentStep === 3) {
      if (!bookingData.service_type) newErrors.service_type = "Veuillez sélectionner un service";
    }

    // Identity step validation
    if (!currentClient) {
      if ((currentStep === 9 && bookingData.service_type === 'regular') || (currentStep === 8 && bookingData.service_type !== 'regular')) {
        const { gender, first_name, last_name, email, phone, password } = bookingData.contact_details;
        if (!gender) newErrors.gender = "La civilité est obligatoire";
        if (!first_name) newErrors.first_name = "Le prénom est obligatoire";
        if (!last_name) newErrors.last_name = "Le nom est obligatoire";
        if (!email) {
          newErrors.email = "L'email est obligatoire";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          newErrors.email = "Veuillez entrer une adresse email valide (ex: prenom@exemple.fr)";
        }
        if (!phone) {
          newErrors.phone = "Le téléphone est obligatoire";
        } else if (!/^0[1-9][0-9]{8}$/.test(phone.replace(/\s/g, ''))) {
          newErrors.phone = "Le téléphone doit contenir 10 chiffres (ex: 0612345678)";
        }
        if (!password) {
          newErrors.password = "Le mot de passe est obligatoire";
        } else if (password.length < 6) {
          newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
        }
      }
    }

    // Payment step validation
    if (currentStep === getMaxStep()) {
      if (!bookingData.has_cleaning_supplies) newErrors.has_cleaning_supplies = "Vous devez confirmer avoir le matériel nécessaire";
      if (!bookingData._cardComplete) newErrors._cardComplete = "Veuillez renseigner vos informations bancaires";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getMaxStep = () => {
    if (currentClient) {
      return 8;
    } else {
      if (bookingData.service_type === 'regular') return 10;
      return 9;
    }
  };

  const handleBack = () => {
    let prevStep = step - 1;

    if (currentClient) {
      // Logged-in user: mirror the forward skip logic
      if (step === 3) prevStep = urssafAlreadyHandled ? null : 2; // null = no back (min step)
      if (step === 2) prevStep = null;
      if (step === 5 && bookingData.service_type !== 'regular') prevStep = 3; // skip step 4 (doesn't exist for non-regular logged-in)
      if (step === 4 && bookingData.service_type === 'regular') prevStep = 3;
    }

    if (prevStep === null) return; // already at minimum step
    setStep(prevStep);
    window.scrollTo(0, 0);
  };

  const handleNext = async () => {
    if (validateStep(step)) {
      let nextStep = step + 1;

      // Skip steps for logged-in users
      if (currentClient) {
        if (step === 1) nextStep = urssafAlreadyHandled ? 3 : 2;
        if (step === 2 && urssafAlreadyHandled) nextStep = 3;
        if (step === 3 && bookingData.service_type === 'regular') nextStep = 4;
        if (step === 3 && bookingData.service_type !== 'regular') nextStep = 5;
        if (step === 4 && bookingData.service_type === 'regular') nextStep = 5;
        if (step === 5) nextStep = 6;
        if (step === 6) nextStep = 7;
        if (step === 7) nextStep = 8;
      }

      const maxStep = getMaxStep();

      // If we're ON the last step and clicking confirm, create booking and redirect
      if (step === maxStep) {
        setLoading(true);
        try {
          await createBookingAndSetupPayment();
        } catch (error) {
          // Error already handled in createBookingAndSetupPayment
        } finally {
          setLoading(false);
        }
        return;
      }

      setStep(nextStep);
      window.scrollTo(0, 0);
    } else {
      toast.error("Veuillez remplir tous les champs obligatoires");
    }
  };

  const createBookingAndSetupPayment = async () => {
    let clientId = null;

    // Confirm Stripe SetupIntent (card fingerprint) before creating booking
    let stripePaymentMethodId = null;
    if (bookingData._stripeInstance && bookingData._stripeCard && stripeSetupInfo?.setupClientSecret) {
      const { setupIntent, error } = await bookingData._stripeInstance.confirmCardSetup(
        stripeSetupInfo.setupClientSecret,
        { payment_method: { card: bookingData._stripeCard } }
      );
      if (error) {
        toast.error(error.message || "Erreur lors de l'enregistrement de la carte.");
        return;
      }
      stripePaymentMethodId = setupIntent?.payment_method || null;
    }

    try {
        if (!currentClient) {
            const { gender, first_name, last_name, email, phone, password } = bookingData.contact_details;

            const newClient = await signup(password, {
                civilite: gender,
                first_name,
                last_name,
                email,
                phone,
                address: bookingData.address,
                zipcode: bookingData.zipcode,
                city: bookingData.city,
                has_animals: bookingData.has_animals === true,
            });
            clientId = newClient.id;

            const clientUpdates = {};
            if (stripePaymentMethodId) {
              clientUpdates.stripe_payment_method_id = stripePaymentMethodId;
              if (stripeSetupInfo?.customerId) clientUpdates.stripe_customer_id = stripeSetupInfo.customerId;
            }
            // Le client vient de demander l'avance immédiate → dossier en attente
            if (bookingData.advance_immediate === true) {
              clientUpdates.ai_status = 'pending';
            }
            if (Object.keys(clientUpdates).length > 0) {
              // updateClient du contexte n'est pas encore rafraîchi juste après signup → update direct
              await Clients.update(clientId, clientUpdates);
            }
        } else {
            clientId = currentClient.id;

            const clientUpdates = {};
            if (bookingData.has_animals !== null && bookingData.has_animals !== currentClient.has_animals) {
              clientUpdates.has_animals = bookingData.has_animals;
            }
            if (stripePaymentMethodId && !currentClient.stripe_payment_method_id) {
              clientUpdates.stripe_payment_method_id = stripePaymentMethodId;
              if (stripeSetupInfo?.customerId && !currentClient.stripe_customer_id) {
                clientUpdates.stripe_customer_id = stripeSetupInfo.customerId;
              }
            }
            // Si le client vient de demander l'avance immédiate pour la première fois
            if (bookingData.advance_immediate === true && (!currentClient.ai_status || currentClient.ai_status === 'none')) {
              clientUpdates.ai_status = 'pending';
            }
            if (Object.keys(clientUpdates).length > 0) {
              await updateClient(clientUpdates);
            }
        }

        const dateStr = format(new Date(bookingData.date), 'yyyy-MM-dd');
        const totalPrice = computePrice(bookingData.service_type, bookingData.duration_minutes);
        const bookingPayload = {
            client_id: clientId,
            address: bookingData.address || currentClient?.address,
            zipcode: bookingData.zipcode || currentClient?.zipcode,
            city: bookingData.city || currentClient?.city,
            additional_address: bookingData.additional_address || null,
            service_type: bookingData.service_type,
            recurrence: bookingData.recurrence || 'none',
            date: dateStr,
            start_time: bookingData.start_time,
            duration_minutes: bookingData.duration_minutes,
            hourly_rate: HOURLY_RATES[bookingData.service_type],
            total_price: totalPrice,
            advance_immediate: bookingData.advance_immediate === true,
            has_animals: bookingData.has_animals !== null ? bookingData.has_animals : (currentClient?.has_animals ?? false),
            has_cleaning_supplies: bookingData.has_cleaning_supplies === true,
            instructions: bookingData.instructions || null,
            status: 'pending',
        };
        const booking = await Bookings.create(bookingPayload);

        // Send notification without blocking redirect
        invokeFunction('notify-booking', { bookingId: booking.id }).catch(err =>
          console.error('Notification error:', err)
        );

        // Clear saved state
        localStorage.removeItem('naky_booking_state');

        // Recap for the confirmation page
        localStorage.setItem('naky_last_booking', JSON.stringify({
          service_type: bookingPayload.service_type,
          duration_minutes: bookingPayload.duration_minutes,
          date: bookingPayload.date,
          start_time: bookingPayload.start_time,
          address: bookingPayload.address,
          zipcode: bookingPayload.zipcode,
          city: bookingPayload.city,
          total_price: bookingPayload.total_price,
        }));

        toast.success("Réservation créée avec succès !");

        // Always redirect after success - delay slightly for toast to show
        setTimeout(() => {
          if (bookingData.advance_immediate === true) {
            window.location.href = createPageUrl('UrssafForm');
          } else {
            window.location.href = createPageUrl('BookingConfirmation');
          }
        }, 500);

    } catch (error) {
        console.error('Error in createBookingAndSetupPayment:', error);
        if (error?.message === 'Un compte existe déjà avec cet email') {
          setErrors(prev => ({ ...prev, email: error.message }));
          toast.error("Un compte existe déjà avec cet email.", {
            duration: 4000,
            action: {
              label: 'Se connecter',
              onClick: () => window.location.href = createPageUrl('Connexion')
            }
          });
          return;
        }
        toast.error("Une erreur est survenue lors de la création de la réservation.");
        throw error;
    }
  };

  if (showEnterpriseThanks) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="text-5xl mb-4">🙏</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Merci, on va vous recontacter !</h1>
        <p className="text-slate-500 max-w-md">
          Votre demande a bien été reçue. Notre équipe vous contactera très prochainement pour établir un devis sur mesure.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8 items-start">
      <EnterpriseDialog
        open={showEnterpriseDialog}
        onClose={() => { setShowEnterpriseDialog(false); updateData({ service_type: '', recurrence: '' }); }}
        onSuccess={() => { setShowEnterpriseDialog(false); setShowEnterpriseThanks(true); }}
      />

      {/* Left Column: Form Steps */}
      <div className="flex-1 w-full md:w-2/3">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Common steps */}
            {step === 1 && !currentClient && <StepAddress data={bookingData} updateData={updateData} errors={errors} onOutOfZone={() => setStep(1)} />}
            {step === 2 && !urssafAlreadyHandled && <StepAdvance data={bookingData} updateData={updateData} />}
            {step === 3 && <StepService data={bookingData} updateData={updateData} onEnterpriseSelect={() => setShowEnterpriseDialog(true)} />}

            {/* Fallback: si step >= 4 et service_type vide, revenir à l'étape 3 */}
            {step >= 4 && !bookingData.service_type && (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-4">Veuillez d'abord sélectionner un type de service.</p>
                <button onClick={() => setStep(3)} className="text-[#E95678] font-medium underline">Choisir un service</button>
              </div>
            )}

            {/* Regular service - Logged in user */}
            {step === 4 && bookingData.service_type === 'regular' && currentClient && <StepFrequency data={bookingData} updateData={updateData} errors={errors} />}
            {step === 5 && bookingData.service_type === 'regular' && currentClient && <StepDuration data={bookingData} updateData={updateData} />}
            {step === 6 && bookingData.service_type === 'regular' && currentClient && <StepDate data={bookingData} updateData={updateData} errors={errors} />}
            {step === 7 && bookingData.service_type === 'regular' && currentClient && <StepTime data={bookingData} updateData={updateData} />}
            {step === 8 && bookingData.service_type === 'regular' && currentClient && <StepStripeCard data={bookingData} updateData={updateData} errors={errors} onCardReady={setStripeSetupInfo} />}

            {/* Regular service - Not logged in */}
            {step === 4 && bookingData.service_type === 'regular' && !currentClient && <StepFrequency data={bookingData} updateData={updateData} errors={errors} />}
            {step === 5 && bookingData.service_type === 'regular' && !currentClient && <StepAnimals data={bookingData} updateData={updateData} />}
            {step === 6 && bookingData.service_type === 'regular' && !currentClient && <StepDuration data={bookingData} updateData={updateData} />}
            {step === 7 && bookingData.service_type === 'regular' && !currentClient && <StepDate data={bookingData} updateData={updateData} errors={errors} />}
            {step === 8 && bookingData.service_type === 'regular' && !currentClient && <StepTime data={bookingData} updateData={updateData} />}
            {step === 9 && bookingData.service_type === 'regular' && !currentClient && <StepIdentity data={bookingData} updateData={updateData} onLoginClick={() => window.location.href = createPageUrl('Connexion')} errors={errors} />}
            {step === 10 && bookingData.service_type === 'regular' && !currentClient && <StepStripeCard data={bookingData} updateData={updateData} errors={errors} onCardReady={setStripeSetupInfo} />}

            {/* Non-regular service - Logged in user */}
            {step === 5 && bookingData.service_type !== 'regular' && currentClient && <StepDuration data={bookingData} updateData={updateData} />}
            {step === 6 && bookingData.service_type !== 'regular' && currentClient && <StepDate data={bookingData} updateData={updateData} errors={errors} />}
            {step === 7 && bookingData.service_type !== 'regular' && currentClient && <StepTime data={bookingData} updateData={updateData} />}
            {step === 8 && bookingData.service_type !== 'regular' && currentClient && <StepStripeCard data={bookingData} updateData={updateData} errors={errors} onCardReady={setStripeSetupInfo} />}

            {/* Non-regular service - Not logged in */}
            {step === 4 && bookingData.service_type !== 'regular' && !currentClient && <StepAnimals data={bookingData} updateData={updateData} />}
            {step === 5 && bookingData.service_type !== 'regular' && !currentClient && <StepDuration data={bookingData} updateData={updateData} />}
            {step === 6 && bookingData.service_type !== 'regular' && !currentClient && <StepDate data={bookingData} updateData={updateData} errors={errors} />}
            {step === 7 && bookingData.service_type !== 'regular' && !currentClient && <StepTime data={bookingData} updateData={updateData} />}
            {step === 8 && bookingData.service_type !== 'regular' && !currentClient && <StepIdentity data={bookingData} updateData={updateData} onLoginClick={() => window.location.href = createPageUrl('Connexion')} errors={errors} />}
            {step === 9 && bookingData.service_type !== 'regular' && !currentClient && <StepStripeCard data={bookingData} updateData={updateData} errors={errors} onCardReady={setStripeSetupInfo} />}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between items-center mt-12 px-4">
             {step > 1 ? (
                 <button onClick={handleBack} className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-2">
                     <ArrowLeft className="w-4 h-4" /> Retour
                 </button>
             ) : <div></div>}

             <Button
               onClick={handleNext}
               disabled={loading}
               className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-8 py-6 text-lg shadow-lg min-w-[140px]"
             >
                 {loading ? (
                   <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Chargement...</>
                 ) : step >= getMaxStep() ? (
                   'Confirmer la réservation'
                 ) : (
                   'Suivant'
                 )}
             </Button>
        </div>
      </div>

      {/* Right Column: Cart Summary */}
      <div className="w-full md:w-1/3 hidden md:block">
        <CartSummary bookingData={bookingData} step={step} currentClient={currentClient} onUpdate={updateData} />
      </div>

    </div>
  );
}
