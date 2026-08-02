import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle2, Banknote, HeartHandshake, Calendar, FileX, Zap, MapPin } from 'lucide-react';
import CandidatureForm from '@/components/partenaire/CandidatureForm';

const avantages = [
  { icon: Calendar, title: "Travail flexible", desc: "Gérez votre emploi du temps librement, selon vos disponibilités." },
  { icon: FileX, title: "Zéro paperasse", desc: "On s'occupe de tout l'administratif. Vous vous concentrez sur votre métier." },
  { icon: Banknote, title: "Paiement rapide", desc: "Chaque mission validée est payée rapidement, sans retard ni complication." },
  { icon: HeartHandshake, title: "Équipe à votre écoute", desc: "Notre support vous accompagne à chaque étape, avant, pendant et après vos missions." },
  { icon: Zap, title: "Statut simplifié", desc: "Devenez auto-entrepreneur en quelques clics avec notre aide, sans stress ni frais cachés." },
  { icon: MapPin, title: "Missions ponctuelles", desc: "Nous vous connectons uniquement avec des clients dans votre zone géographique." },
];

const etapes = [
  { num: 1, titre: "Vous remplissez le formulaire", desc: "Envoyez-nous quelques informations de base : coordonnées, disponibilités, expérience… Cela ne prend que 2 minutes." },
  { num: 2, titre: "On vous contacte rapidement", desc: "Notre équipe vous appelle pour faire connaissance, répondre à vos questions, et valider ensemble les prochaines étapes." },
  { num: 3, titre: "On vous forme pour démarrer", desc: "On vous aide à devenir une fée du logis, et on vous guide pour votre première mission. Vous êtes prêt(e) à intervenir." },
  { num: 4, titre: "Vous commencez à travailler", desc: "Vous recevez vos premières missions, proches de chez vous. Vous êtes payé(e) rapidement après chaque intervention." },
];

export default function Partenaire() {
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSuccess = () => {
    setShowForm(false);
    setSuccess(true);
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#E95678]/10 to-[#ECF5F0] py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-[#E95678]/10 text-[#E95678] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            Rejoignez notre équipe
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Devenez agent de ménage<br />partenaire avec <span className="text-[#E95678]">Naky</span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Rejoignez une communauté de professionnels engagés. Avec NAKY, vous travaillez à votre rythme, près de chez vous, avec un vrai accompagnement.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-600 mb-10">
            {['Liberté et flexibilité', 'Paiement rapide et sécurisé', 'Un vrai accompagnement'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#E95678]" />
                {item}
              </div>
            ))}
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg"
          >
            Devenir partenaire
          </Button>
        </div>
      </section>

      {/* Succès message */}
      {success && (
        <div className="max-w-2xl mx-auto my-8 bg-green-50 border border-green-200 rounded-2xl p-8 text-center mx-6">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Candidature envoyée !</h3>
          <p className="text-slate-600">Merci pour votre candidature. Notre équipe vous contactera très prochainement.</p>
        </div>
      )}

      {/* Pourquoi */}
      <section className="py-20 px-6 bg-[#ECF5F0]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Pourquoi devenir<br />partenaire Naky ?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Nous mettons tout en œuvre pour vous offrir les meilleures conditions de travail : flexibilité, proximité, sécurité et accompagnement. Avec NAKY, vous êtes libre… et soutenu(e).
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="mt-6 bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-7 py-5"
            >
              Devenir partenaire
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {avantages.map((av) => {
              const Icon = av.icon;
              return (
                <div key={av.title} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-[#E95678]/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#E95678]" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{av.title}</h3>
                  <p className="text-sm text-slate-500">{av.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Étapes */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-14">
            Voici étape par étape<br />pour devenir partenaire
          </h2>
          <div className="space-y-6">
            {etapes.map((e) => (
              <div key={e.num} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-[#E95678] text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                  {e.num}
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-6 flex-1 shadow-sm">
                  <div className="text-xs text-[#E95678] font-semibold mb-1">Étape {e.num}</div>
                  <h3 className="font-bold text-slate-900 mb-1">{e.titre}</h3>
                  <p className="text-sm text-slate-500">{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg"
            >
              Je postule maintenant
            </Button>
          </div>
        </div>
      </section>

      {/* Dialog formulaire */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-8">
          <CandidatureForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}