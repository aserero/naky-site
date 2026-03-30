import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Upload } from 'lucide-react';

const STEPS = [
  { label: "C'est parti !", number: 1 },
  { label: "Informations personnelles", number: 2 },
  { label: "Expérience professionnelle", number: 3 },
];

const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-center gap-0 mb-10">
    {STEPS.map((step, i) => {
      const done = step.number < currentStep;
      const active = step.number === currentStep;
      return (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
              done ? 'bg-[#E95678] border-[#E95678] text-white' :
              active ? 'bg-[#E95678] border-[#E95678] text-white' :
              'bg-white border-slate-300 text-slate-400'
            }`}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : step.number}
            </div>
            <span className={`text-xs mt-1 font-medium text-center max-w-[90px] ${active ? 'text-[#E95678]' : done ? 'text-[#E95678]' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 ${done ? 'bg-[#E95678]' : 'bg-slate-200'}`} style={{minWidth: 40}} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

export default function CandidatureForm({ onSuccess }) {
  const [step, setStep] = useState(1);
  const [accepted, setAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    civilite: 'Mme',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    zipcode: '',
    city: '',
    permis_sejour: '',
    heures_semaine: '',
    annees_experience: '',
    lieux_experience: [],
    vehicule: '',
    cv_url: '',
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const toggleLieu = (lieu) => {
    setForm(f => ({
      ...f,
      lieux_experience: f.lieux_experience.includes(lieu)
        ? f.lieux_experience.filter(l => l !== lieu)
        : [...f.lieux_experience, lieu]
    }));
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('cv_url', file_url);
    setUploading(false);
  };

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await base44.entities.Candidature.create({
      ...form,
      status: 'pending',
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Merci pour votre candidature !</h2>
        <p className="text-slate-600 mb-2">
          Nous avons bien reçu votre dossier, <strong>{form.first_name}</strong> 🎉
        </p>
        <p className="text-slate-500 text-sm leading-relaxed">
          Notre équipe va l'examiner avec attention et vous recontactera très prochainement par email ou par téléphone pour faire connaissance et vous présenter les prochaines étapes.
        </p>
        <p className="text-xs text-slate-400 mt-6">À très bientôt chez Naky 💚</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <StepIndicator currentStep={step} />

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Quelle est votre adresse email ?</h2>
            <p className="text-sm text-slate-500">Nous utilisons votre email uniquement pour vous contacter, pas d'envoi de spam.</p>
          </div>
          <Input
            type="email"
            placeholder="Votre email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            className="h-12 text-base"
          />
          <div className="flex items-center gap-3">
            <Checkbox id="cgu" checked={accepted} onCheckedChange={setAccepted} />
            <label htmlFor="cgu" className="text-sm text-slate-600 cursor-pointer">
              J'accepte les <span className="text-[#E95678] underline">conditions d'utilisation</span>
            </label>
          </div>
          <Button
            onClick={() => setStep(2)}
            disabled={!form.email || !accepted}
            className="w-full h-12 bg-[#E95678] hover:bg-[#d44565] text-white text-base font-semibold"
          >
            Suivant
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-bold text-slate-900">Parlez-nous de vous</h2>
          <div className="space-y-2">
            <Label>Titre</Label>
            <select
              value={form.civilite}
              onChange={e => set('civilite', e.target.value)}
              className="w-full h-12 border border-slate-200 rounded-md px-3 text-base bg-white"
            >
              <option value="Mme">Madame</option>
              <option value="M">Monsieur</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Prénom *</Label>
            <Input placeholder="Prénom" value={form.first_name} onChange={e => set('first_name', e.target.value)} className="h-12" />
          </div>
          <div className="space-y-2">
            <Label>Nom de famille</Label>
            <Input placeholder="Nom de famille" value={form.last_name} onChange={e => set('last_name', e.target.value)} className="h-12" />
          </div>
          <div className="space-y-2">
            <Label>Numéro de téléphone</Label>
            <Input placeholder="Numéro de téléphone" value={form.phone} onChange={e => set('phone', e.target.value)} className="h-12" />
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input placeholder="Nom de rue" value={form.address} onChange={e => set('address', e.target.value)} className="h-12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Code postal</Label>
              <Input placeholder="Code postal" value={form.zipcode} onChange={e => set('zipcode', e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input placeholder="Ville" value={form.city} onChange={e => set('city', e.target.value)} className="h-12" />
            </div>
          </div>
          <Button
            onClick={() => setStep(3)}
            disabled={!form.first_name}
            className="w-full h-12 bg-[#E95678] hover:bg-[#d44565] text-white text-base font-semibold"
          >
            Suivant
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8">
          {/* Permis de séjour */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">De quel permis de séjour disposez-vous ?</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'francaise', label: 'Nationalité française' },
                { value: 'visa', label: 'Visa' },
                { value: 'europeenne', label: 'Citoyenneté européenne' },
                { value: 'aucun', label: 'Aucun permis de travail' },
                { value: 'titre_residence', label: 'Titre de résidence' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="permis" value={opt.value}
                    checked={form.permis_sejour === opt.value}
                    onChange={() => set('permis_sejour', opt.value)}
                    className="accent-[#E95678] w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Heures par semaine */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Combien d'heures aimeriez-vous travailler par semaine ?</h3>
            <div className="space-y-3">
              {[
                { value: '5-15', label: '5-15 heures par semaine' },
                { value: '15-30', label: '15-30 heures par semaine' },
                { value: '31-35', label: '31-35 heures par semaine' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="heures" value={opt.value}
                    checked={form.heures_semaine === opt.value}
                    onChange={() => set('heures_semaine', opt.value)}
                    className="accent-[#E95678] w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Années d'expérience */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Combien d'années d'expérience avez-vous ?</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'aucune', label: 'Aucune' },
                { value: 'plus_2ans', label: 'Plus de 2 ans' },
                { value: 'moins_2ans', label: 'Moins de 2 ans' },
                { value: 'plus_5ans', label: 'Plus de 5 ans' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="experience" value={opt.value}
                    checked={form.annees_experience === opt.value}
                    onChange={() => set('annees_experience', opt.value)}
                    className="accent-[#E95678] w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Lieux d'expérience */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Où avez-vous acquis votre expérience ?</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                'Maisons / Appartements', 'Clinique / Hôpital',
                'Hôtels / Restaurants', 'Bureaux',
              ].map(lieu => (
                <label key={lieu} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.lieux_experience.includes(lieu)}
                    onCheckedChange={() => toggleLieu(lieu)}
                  />
                  <span className="text-sm text-slate-700">{lieu}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Véhicule */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Disposez-vous d'un véhicule ?</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'voiture', label: 'Oui, une voiture' },
                { value: 'velo', label: 'Oui, un vélo' },
                { value: 'scooter', label: 'Oui, un scooter' },
                { value: 'non', label: 'Non' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="vehicule" value={opt.value}
                    checked={form.vehicule === opt.value}
                    onChange={() => set('vehicule', opt.value)}
                    className="accent-[#E95678] w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CV Upload */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-slate-900">Déposez votre CV pour augmenter vos chances d'être contacté(e).</h3>
              <span className="text-sm text-slate-400">(optionnel)</span>
            </div>
            <label className="block border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-[#E95678] transition-colors bg-slate-50">
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="hidden" />
              <Upload className="w-8 h-8 mx-auto mb-3 text-slate-400" />
              {form.cv_url ? (
                <p className="text-green-600 font-medium text-sm">✓ CV uploadé avec succès</p>
              ) : uploading ? (
                <p className="text-slate-500 text-sm">Upload en cours...</p>
              ) : (
                <>
                  <p className="text-[#E95678] font-medium text-sm">Parcourir les fichiers</p>
                  <p className="text-slate-400 text-xs mt-1">Glissez et déposez des fichiers ici</p>
                </>
              )}
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="w-full h-12 bg-[#E95678] hover:bg-[#d44565] text-white text-base font-semibold"
          >
            {submitting ? 'Envoi en cours...' : 'Envoyer mes réponses'}
          </Button>
        </div>
      )}
    </div>
  );
}