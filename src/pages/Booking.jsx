import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import CartSummary from '../components/booking/CartSummary';
import { ArrowLeft, CheckCircle2, Home, CalendarDays, Clock, User, CreditCard, Sparkles, Building2, CalendarRange, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { createPageUrl } from '@/utils';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { StepAddress, StepIdentity, StepDate } from '@/components/booking/BookingSteps';
import StepStripeCard from '@/components/booking/StepStripeCard';
import CleaningSuppliesDialog from '@/components/booking/CleaningSuppliesDialog';
import EnterpriseDialog from '@/components/booking/EnterpriseDialog';
import { useAuth } from '@/components/AuthContext';

// --- Step Components ---

// StepAddress imported

const StepAdvance = ({ data, onSelect }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Souhaitez-vous bénéficier de l'avance immédiate ?</h2>
      <p className="text-slate-500">L'URSSAF prélèvera sur ce compte 50% du montant de vos sessions ménage.</p>
    </div>
    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
      <button
        onClick={() => onSelect({ advance_immediate: true })}
        className={`h-16 rounded-xl border-2 transition-all font-medium ${data.advance_immediate === true ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        Oui
      </button>
      <button
        onClick={() => onSelect({ advance_immediate: false })}
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

const StepService = ({ data, onSelect, onEnterpriseSelect, currentClient }) => {
  const showDiscount = !!currentClient || data.advance_immediate === true;
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
        fullPrice="26"
        discountedPrice="13"
        showDiscount={showDiscount}
        active={data.service_type === 'regular'}
        onClick={() => onSelect({ service_type: 'regular', recurrence: data.recurrence || 'weekly' })}
      />
      <ServiceCard 
        icon={Clock}
        title="Ménage ponctuel classique"
        fullPrice="29"
        discountedPrice="14.5"
        showDiscount={showDiscount}
        active={data.service_type === 'one_time'}
        onClick={() => onSelect({ service_type: 'one_time', recurrence: 'none' })}
      />
      <ServiceCard 
        icon={Home}
        title="Nettoyage de printemps"
        fullPrice="32"
        discountedPrice="16"
        showDiscount={showDiscount}
        active={data.service_type === 'spring'}
        onClick={() => onSelect({ service_type: 'spring', recurrence: 'none' })}
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

const StepFrequency = ({ data, onSelect }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">À quelle fréquence ?</h2>
      <p className="text-slate-500">Choisissez la fréquence de vos ménages réguliers</p>
    </div>
    <div className="space-y-4 max-w-md mx-auto">
      <button
        onClick={() => onSelect({ recurrence: 'weekly' })}
        className={`w-full py-4 rounded-xl border-2 transition-all font-medium relative ${data.recurrence === 'weekly' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        <span>1 fois par semaine</span>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs bg-[#E95678] text-white px-3 py-1 rounded-full">
          Populaire
        </span>
      </button>
      <button
        onClick={() => onSelect({ recurrence: 'twice_weekly' })}
        className={`w-full py-4 rounded-xl border-2 transition-all font-medium ${data.recurrence === 'twice_weekly' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        2 fois par semaine
      </button>
      <button
        onClick={() => onSelect({ recurrence: 'biweekly' })}
        className={`w-full py-4 rounded-xl border-2 transition-all font-medium ${data.recurrence === 'biweekly' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        1 fois toutes les deux semaines
      </button>
      <button
        onClick={() => onSelect({ recurrence: 'monthly' })}
        className={`w-full py-4 rounded-xl border-2 transition-all font-medium ${data.recurrence === 'monthly' ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        1 fois par mois
      </button>
    </div>
    <p className="text-center text-slate-500 text-sm mt-6">* Appelez-nous si vous voulez choisir une autre fréquence</p>
  </div>
);

const StepAnimals = ({ data, onSelect }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Possédez-vous des animaux ?</h2>
    </div>
    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
      <button
        onClick={() => onSelect({ has_animals: true })}
        className={`h-16 rounded-xl border-2 transition-all font-medium ${data.has_animals === true ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        Oui
      </button>
      <button
        onClick={() => onSelect({ has_animals: false })}
        className={`h-16 rounded-xl border-2 transition-all font-medium ${data.has_animals === false ? 'border-[#E95678] bg-[#FFF0F3] text-[#E95678]' : 'border-slate-200 bg-white hover:border-[#E95678]/50'}`}
      >
        Non
      </button>
    </div>
  </div>
);

const durationDescriptions = {
  "2h": "Petit ménage ciblé régulier (ex : 1 chambre, 1 sdb)",
  "2h30": "Petit ménage ciblé régulier (ex : 1 salon et 1 cuisine)",
  "3h": "Ménage standard d'un 2 pièces (ex : 1 salon, 1 chambre, 1 sdb)",
  "3h30": "Ménage standard d'un 2 pièces (ex : 1 salon, 1 chambre, 1 sdb, 1 cuisine)",
  "4h": "Ménage complet d'un 3 pièces",
  "4h30": "Ménage complet d'un 3 à 4 pièces",
  "5h": "Ménage complet d'un 4 pièces",
  "5h30": "Grand ménage du logement",
  "6h": "Grand ménage de tout le logement",
  "7h": "Grand ménage de tout le logement"
};

const StepDuration = ({ data, onSelect }) => {
  const durations = ["2h", "2h30", "3h", "3h30", "4h", "4h30", "5h", "5h30", "6h", "7h"];
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Choisissez la durée de votre ménage</h2>
        <p className="text-slate-500">Confirmation reçue sous 24h</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {durations.map(d => (
          <button
            key={d}
            onClick={() => onSelect({ duration: d })}
            className={`py-3 rounded-xl border transition-all font-medium ${data.duration === d ? 'border-[#E95678] bg-white ring-2 ring-[#E95678] text-[#E95678]' : 'border-white bg-white hover:bg-slate-50'}`}
          >
            {d}
          </button>
        ))}
      </div>
      
    </div>
  );
};

const StepTime = ({ data, onSelect }) => {
  const times = ["8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h", "20h"];
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Quel horaire pour votre ménage ?</h2>
        <p className="text-slate-500">Sélectionnez votre créneau horaire</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {times.map(t => (
          <button
            key={t}
            onClick={() => onSelect({ time: t })}
            className={`py-3 rounded-xl border transition-all font-medium ${data.time === t ? 'border-[#E95678] bg-white ring-2 ring-[#E95678] text-[#E95678]' : 'border-white bg-white hover:bg-slate-50'}`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Main Page Component ---

const InfoIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
);

export default function BookingPage() {
  const { currentClient, signup } = useAuth();
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
    has_animals: null,
    duration: '',
    date: '',
    time: '',
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

  // Check for saved state on mount and prefill for logged-in users
  useEffect(() => {
    if (!currentClient) {
      // User not logged in - clear any saved state and start fresh
      localStorage.removeItem('naky_booking_state');
      setIsLoaded(true);
      return;
    }
    
    // User is logged in - start at step 2 (or 3 if URSSAF already handled)
    const urssafAlreadyHandled = currentClient.urssaf_completed || (currentClient.urssaf_status && currentClient.urssaf_status !== 'none');
    
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
        setStep(urssafAlreadyHandled ? 3 : 2);
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
      setStep(urssafAlreadyHandled ? 3 : 2);
    }
    
    setIsLoaded(true);
  }, [currentClient]);

  // Save state on change - only for logged-in users
  useEffect(() => {
    if (isLoaded && currentClient) {
      const { _stripeInstance, _stripeCard, _cardComplete, ...persistedBookingData } = bookingData;
      localStorage.setItem('naky_booking_state', JSON.stringify({ data: persistedBookingData, step }));
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

  const getMaxStepForData = (dataSnapshot) => {
    if (currentClient) {
      return 8;
    }
    if (dataSnapshot.service_type === 'regular') return 10;
    return 9;
  };

  const getNextStepForData = (currentStep, dataSnapshot) => {
    let nextStep = currentStep + 1;
    const urssafAlreadyHandled = currentClient?.urssaf_completed || (currentClient?.urssaf_status && currentClient.urssaf_status !== 'none');

    if (currentClient) {
      if (currentStep === 1) nextStep = urssafAlreadyHandled ? 3 : 2;
      if (currentStep === 2 && urssafAlreadyHandled) nextStep = 3;
      if (currentStep === 3 && dataSnapshot.service_type === 'regular') nextStep = 4;
      if (currentStep === 3 && dataSnapshot.service_type !== 'regular') nextStep = 5;
      if (currentStep === 4 && dataSnapshot.service_type === 'regular') nextStep = 5;
      if (currentStep === 5 && dataSnapshot.service_type === 'regular') nextStep = 6;
      if (currentStep === 5 && dataSnapshot.service_type !== 'regular') nextStep = 6;
      if (currentStep === 6) nextStep = 7;
      if (currentStep === 7) nextStep = 8;
    }

    return Math.min(nextStep, getMaxStepForData(dataSnapshot));
  };

  const handleChoiceAndAdvance = (newData) => {
    const nextData = { ...bookingData, ...newData };
    updateData(newData);
    const nextStep = getNextStepForData(step, nextData);
    window.setTimeout(() => {
      setStep(nextStep);
      window.scrollTo(0, 0);
    }, 0);
  };

  const getStepNumber = (logicalStep) => {
    if (bookingData.service_type === 'regular') {
      return logicalStep;
    } else {
      if (logicalStep <= 3) return logicalStep;
      return logicalStep - 1;
    }
  };

  const validateStep = (currentStep) => {
    const newErrors = {};
    
    // Skip address validation for logged-in users
    if (currentStep === 1 && !currentClient) {
      if (!bookingData.address) newErrors.address = "L'adresse est obligatoire";
      if (!bookingData.zipcode) newErrors.zipcode = "Le code postal est obligatoire";
      if (!bookingData.city) newErrors.city = "La ville est obligatoire";
      const allowedDepts = ['75', '92', '93', '94'];
      if (bookingData.zipcode && !allowedDepts.some(d => bookingData.zipcode.startsWith(d))) {
        newErrors.zipcode = "Nous n'intervenons que sur Paris (75) et les départements 92, 93, 94";
        return false;
      }
    }
    
    // Skip URSSAF question for users who already made a choice (completed or pending)
    const urssafAlreadyHandled = currentClient?.urssaf_completed || (currentClient?.urssaf_status && currentClient.urssaf_status !== 'none');
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
      if ((currentStep === 5 && bookingData.service_type === 'regular') || (currentStep === 5 && bookingData.service_type !== 'regular')) {
        if (!bookingData.duration) newErrors.duration = "Veuillez choisir une durée";
      }
    } else {
      if ((currentStep === 6 && bookingData.service_type === 'regular') || (currentStep === 5 && bookingData.service_type !== 'regular')) {
        if (!bookingData.duration) newErrors.duration = "Veuillez choisir une durée";
      }
    }

    // Date validation
    if (currentClient) {
      if ((currentStep === 6 && bookingData.service_type === 'regular') || (currentStep === 6 && bookingData.service_type !== 'regular')) {
        if (!bookingData.date) newErrors.date = "Veuillez sélectionner une date";
      }
    } else {
      if ((currentStep === 7 && bookingData.service_type === 'regular') || (currentStep === 6 && bookingData.service_type !== 'regular')) {
        if (!bookingData.date) newErrors.date = "Veuillez sélectionner une date";
      }
    }

    // Time validation
    if (currentClient) {
      if ((currentStep === 7 && bookingData.service_type === 'regular') || (currentStep === 7 && bookingData.service_type !== 'regular')) {
        if (!bookingData.time) newErrors.time = "Veuillez sélectionner un horaire";
      }
    } else {
      if ((currentStep === 8 && bookingData.service_type === 'regular') || (currentStep === 7 && bookingData.service_type !== 'regular')) {
        if (!bookingData.time) newErrors.time = "Veuillez sélectionner un horaire";
      }
    }

    // Service type validation
    if (currentStep === 3) {
      if (!bookingData.service_type) newErrors.service_type = "Veuillez sélectionner un service";
    }

    // Identity step validation
    if (currentClient) {
      // Skip identity for logged-in users
    } else {
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
        if (!password) newErrors.password = "Le mot de passe est obligatoire";
      }
    }

    // Payment step validation
    const paymentStep = currentClient ? 8 : (bookingData.service_type === 'regular' ? 10 : 9);
    if (currentStep === paymentStep || (currentClient && currentStep === 8) || (!currentClient && ((currentStep === 10 && bookingData.service_type === 'regular') || (currentStep === 9 && bookingData.service_type !== 'regular')))) {
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
    const urssafAlreadyHandled = currentClient?.urssaf_completed || (currentClient?.urssaf_status && currentClient.urssaf_status !== 'none');
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

  const calculatePrice = () => {
     let rate = 26;
     if (bookingData.service_type === 'one_time') rate = 29;
     if (bookingData.service_type === 'spring') rate = 32;
     const hours = bookingData.duration ? parseFloat(bookingData.duration.replace('h', '.')) : 0;
     return Math.ceil(rate * hours * 100) / 100;
  };

  const handleNext = async () => {
    // Check for duplicate email at identity step before proceeding
    const identityStep = bookingData.service_type === 'regular' ? 9 : 8;
    if (!currentClient && step === identityStep) {
      const email = bookingData.contact_details?.email;
      if (email) {
        setLoading(true);
        const existing = await base44.entities.Client.filter({ email });
        setLoading(false);
        if (existing.length > 0) {
          setErrors(prev => ({ ...prev, email: 'Cette adresse email est déjà utilisée' }));
          toast.error("Mail déjà utilisé. Veuillez vous connecter.", {
            duration: 4000,
            action: { label: 'Se connecter', onClick: () => window.location.href = createPageUrl('Connexion') }
          });
          return;
        }
      }
    }

    if (validateStep(step)) {
      let nextStep = step + 1;
      
      // Skip steps for logged-in users
      const urssafAlreadyHandled = currentClient?.urssaf_completed || (currentClient?.urssaf_status && currentClient.urssaf_status !== 'none');
      if (currentClient) {
        if (step === 1) nextStep = urssafAlreadyHandled ? 3 : 2;
        if (step === 2 && urssafAlreadyHandled) nextStep = 3;
        if (step === 3 && bookingData.service_type === 'regular') nextStep = 4;
        if (step === 3 && bookingData.service_type !== 'regular') nextStep = 5;
        if (step === 4 && bookingData.service_type === 'regular') nextStep = 5;
        if (step === 5 && bookingData.service_type === 'regular') nextStep = 6;
        if (step === 5 && bookingData.service_type !== 'regular') nextStep = 6;
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
            const { first_name, last_name, email, phone, password } = bookingData.contact_details;
            
            // Vérifier si le compte existe déjà
            const existingClients = await base44.entities.Client.filter({ email });
            if (existingClients.length > 0) {
                setLoading(false);
                toast.error("Un compte existe déjà avec cet email.", {
                    duration: 4000,
                    action: {
                        label: 'Se connecter',
                        onClick: () => window.location.href = createPageUrl('Connexion')
                    }
                });
                return;
            }
            
            const newClient = await signup({
                first_name,
                last_name,
                email,
                phone,
                password,
                address: bookingData.address,
                zipcode: bookingData.zipcode,
                city: bookingData.city,
                status: 'active',
                ...(stripePaymentMethodId ? {
                  stripe_payment_method_id: stripePaymentMethodId,
                  stripe_customer_id: stripeSetupInfo?.customerId || null,
                } : {})
            });
            clientId = newClient.id;

            // Cas 2 : NON à l'avance immédiate → envoyer le webhook "create" immédiatement
            if (bookingData.advance_immediate === false) {
              base44.functions.invoke('sendUrssafWebhook', {
                clientId: newClient.id,
                action: 'create',
                formData: {
                  first_name,
                  last_name,
                  email,
                  phone,
                  address: bookingData.address,
                  zipcode: bookingData.zipcode,
                  city: bookingData.city,
                }
              }).then(res => {
                if (res?.data?.idAbby) {
                  base44.entities.Client.update(newClient.id, { idAbby: res.data.idAbby }).catch(console.error);
                }
              }).catch(err => console.error('URSSAF webhook error:', err));
            }
            // Cas 1 : OUI à l'avance immédiate → le webhook sera envoyé après le formulaire URSSAF (avec action "create")
        } else {
            clientId = currentClient.id;
            
            const clientUpdates = {};
            if (bookingData.has_animals !== null && bookingData.has_animals !== currentClient.has_animals) {
              clientUpdates.has_animals = bookingData.has_animals;
            }
            if (stripePaymentMethodId && !currentClient.stripe_payment_method_id) {
              clientUpdates.stripe_payment_method_id = stripePaymentMethodId;
              clientUpdates.stripe_customer_id = stripeSetupInfo?.customerId || currentClient.stripe_customer_id || null;
            }
            // Si le client vient de demander l'avance immédiate pour la première fois
            if (bookingData.advance_immediate === true && (!currentClient.urssaf_status || currentClient.urssaf_status === 'none')) {
              clientUpdates.urssaf_status = 'pending';
            }
            if (Object.keys(clientUpdates).length > 0) {
              await base44.entities.Client.update(clientId, clientUpdates);
            }
        }

        const totalPrice = calculatePrice();
        // Exclude non-serializable Stripe objects and private fields
        const { _stripeInstance, _stripeCard, _cardComplete, ...cleanBookingData } = bookingData;
        const booking = await base44.entities.Booking.create({
            ...cleanBookingData,
            address: bookingData.address || currentClient?.address,
            zipcode: bookingData.zipcode || currentClient?.zipcode,
            city: bookingData.city || currentClient?.city,
            has_animals: bookingData.has_animals !== null ? bookingData.has_animals : currentClient?.has_animals,
            client_id: clientId,
            status: 'pending',
            total_price: totalPrice
        });

        console.log('Booking created:', booking.id);
        
        // Send notification without blocking redirect
        base44.functions.invoke('sendBookingNotification', { bookingId: booking.id }).catch(err => 
          console.error('Notification error:', err)
        );

        // Clear saved state
        localStorage.removeItem('naky_booking_state');
        
        toast.success("Réservation créée avec succès !");
        
        // Always redirect after success - delay slightly for toast to show
        setTimeout(() => {
          if (bookingData.advance_immediate) {
            window.location.href = createPageUrl('UrssafForm');
          } else {
            window.location.href = createPageUrl('UserDashboard');
          }
        }, 500);
        
    } catch (error) {
        console.error('Error in createBookingAndSetupPayment:', error);
        toast.error(error?.message || "Une erreur est survenue lors de la création de la réservation.");
        throw error;
    }
  };



  // Resume logic if returning from login
  useEffect(() => {
     if (!isLoaded) return;
     
     const params = new URLSearchParams(window.location.search);
     if (params.get('resume') === 'true') {
         // Only submit if we have a valid date and user is logged in
         if (currentClient && bookingData.date) {
             handleFinalSubmit();
         }
     }
  }, [isLoaded, currentClient]);

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
            {step === 2 && !currentClient?.urssaf_completed && !(currentClient?.urssaf_status && currentClient.urssaf_status !== 'none') && <StepAdvance data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 3 && <StepService data={bookingData} onSelect={handleChoiceAndAdvance} currentClient={currentClient} onEnterpriseSelect={() => setShowEnterpriseDialog(true)} />}
            
            {/* Fallback: si step >= 4 et service_type vide, revenir à l'étape 3 */}
            {step >= 4 && !bookingData.service_type && (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-4">Veuillez d'abord sélectionner un type de service.</p>
                <button onClick={() => setStep(3)} className="text-[#E95678] font-medium underline">Choisir un service</button>
              </div>
            )}

            {/* Regular service - Logged in user */}
            {step === 4 && bookingData.service_type === 'regular' && currentClient && <StepFrequency data={bookingData} onSelect={handleChoiceAndAdvance} errors={errors} />}
            {step === 5 && bookingData.service_type === 'regular' && currentClient && <StepDuration data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 6 && bookingData.service_type === 'regular' && currentClient && <StepDate data={bookingData} updateData={updateData} errors={errors} />}
            {step === 7 && bookingData.service_type === 'regular' && currentClient && <StepTime data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 8 && bookingData.service_type === 'regular' && currentClient && <StepStripeCard data={bookingData} updateData={updateData} errors={errors} currentClient={currentClient} onCardReady={setStripeSetupInfo} />}
            
            {/* Regular service - Not logged in */}
            {step === 4 && bookingData.service_type === 'regular' && !currentClient && <StepFrequency data={bookingData} onSelect={handleChoiceAndAdvance} errors={errors} />}
            {step === 5 && bookingData.service_type === 'regular' && !currentClient && <StepAnimals data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 6 && bookingData.service_type === 'regular' && !currentClient && <StepDuration data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 7 && bookingData.service_type === 'regular' && !currentClient && <StepDate data={bookingData} updateData={updateData} errors={errors} />}
            {step === 8 && bookingData.service_type === 'regular' && !currentClient && <StepTime data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 9 && bookingData.service_type === 'regular' && !currentClient && <StepIdentity data={bookingData} updateData={updateData} onLoginClick={() => window.location.href = createPageUrl('Connexion')} errors={errors} />}
            {step === 10 && bookingData.service_type === 'regular' && !currentClient && <StepStripeCard data={bookingData} updateData={updateData} errors={errors} currentClient={currentClient} onCardReady={setStripeSetupInfo} />}
            
            {/* Non-regular service - Logged in user */}
            {step === 5 && bookingData.service_type !== 'regular' && currentClient && <StepDuration data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 6 && bookingData.service_type !== 'regular' && currentClient && <StepDate data={bookingData} updateData={updateData} errors={errors} />}
            {step === 7 && bookingData.service_type !== 'regular' && currentClient && <StepTime data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 8 && bookingData.service_type !== 'regular' && currentClient && <StepStripeCard data={bookingData} updateData={updateData} errors={errors} currentClient={currentClient} onCardReady={setStripeSetupInfo} />}
            
            {/* Non-regular service - Not logged in */}
            {step === 4 && bookingData.service_type !== 'regular' && !currentClient && <StepAnimals data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 5 && bookingData.service_type !== 'regular' && !currentClient && <StepDuration data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 6 && bookingData.service_type !== 'regular' && !currentClient && <StepDate data={bookingData} updateData={updateData} errors={errors} />}
            {step === 7 && bookingData.service_type !== 'regular' && !currentClient && <StepTime data={bookingData} onSelect={handleChoiceAndAdvance} />}
            {step === 8 && bookingData.service_type !== 'regular' && !currentClient && <StepIdentity data={bookingData} updateData={updateData} onLoginClick={() => window.location.href = createPageUrl('Connexion')} errors={errors} />}
            {step === 9 && bookingData.service_type !== 'regular' && !currentClient && <StepStripeCard data={bookingData} updateData={updateData} errors={errors} currentClient={currentClient} onCardReady={setStripeSetupInfo} />}
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
