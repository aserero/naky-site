import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, User } from 'lucide-react';
import AnimatedCounters from '@/components/home/AnimatedCounters';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthContext';

export default function Home() {
  const { currentClient } = useAuth();

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl('UserDashboard'));
  };

  return (
    <div className="min-h-screen bg-[#ECF5F0]">
      {/* Hero encart */}
      <section className="bg-[#FDF0F3] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center min-h-[480px]">
          {/* Texte gauche */}
          <div className="flex-1 py-16 md:py-20">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-[#E95678]" />
              <span className="text-sm text-slate-700 font-medium">Paris & Alentours</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Nettoie en un klic
            </h1>

            <p className="text-base text-slate-600 mb-6">
              Trouvez votre agent de ménage de confiance en quelques clics.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                'Agents sélectionnés et compétents',
                'Horaires flexibles',
                'Sans engagement',
                "50% d'avance immédiate du crédit d'impôt",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#E95678] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link to={createPageUrl('Booking')}>
              <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-8 py-3 text-base font-semibold shadow-lg inline-flex items-center gap-2">
                Je réserve mon ménage
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Button>
            </Link>

            {currentClient && (
              <div className="mt-4">
                <Link to={createPageUrl('UserDashboard')}>
                  <Button variant="outline" className="rounded-full px-8 py-3 text-base font-medium">
                    Voir mon compte
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Compteurs animés droite */}
          <div className="flex-1 flex justify-center items-center py-10 md:py-0">
            <AnimatedCounters />
          </div>
        </div>
      </section>

      {/* Sections marketing */}
      {/* Services Section */}
      <div className="bg-white py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Nos services de ménage</h2>
            <p className="text-base text-slate-600">Trouvez le service qui vous simplifie vraiment la vie.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699ece5a2c48b8cfd3773f8a/1ebabe568_692f1d0135ace5bf37ae7fb4_young-cleaner-vacuuming-floor-in-p-500.jpg" alt="Ménage à domicile" className="w-full h-48 object-cover" />
              <div className="p-4"><h3 className="font-semibold text-lg text-slate-900 mb-2">Ménage à domicile</h3><p className="text-sm text-slate-600">Votre intérieur propre et sain, sans lever le petit doigt.</p></div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699ece5a2c48b8cfd3773f8a/8573e1302_692f1c7dab790ce1462accf2_woman-ironing-a-shirt-with-a-red-p-500.jpg" alt="Repassage professionnel" className="w-full h-48 object-cover" />
              <div className="p-4"><h3 className="font-semibold text-lg text-slate-900 mb-2">Repassage professionnel</h3><p className="text-sm text-slate-600">Du linge impeccable sans perdre une minute</p></div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699ece5a2c48b8cfd3773f8a/2f1c9f7d0_692f1b2a8fa6e6ab10e5267f_professional-cleaning-bucket-wit-p-500.jpg" alt="Entreprise" className="w-full h-48 object-cover" />
              <div className="p-4"><h3 className="font-semibold text-lg text-slate-900 mb-2">Entreprise</h3><p className="text-sm text-slate-600">Services personnalisés en fonction de vos besoins</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Ménage sans prise de tête */}
      <div className="py-16 px-6 bg-[#ECF5F0]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Ménage sans prise de tête</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Nos clients nous choisissent (et nous recommandent) pour une raison simple : on fait ce qu'on promet. Et on le fait bien.</p>
            <Link to={createPageUrl('Booking')} className="mt-6 inline-flex">
              <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-8 py-3 font-semibold shadow-lg">Je réserve mon ménage</Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: "🏅", title: "Professionnels sélectionnés avec soin", desc: "Tous nos agents sont formés, assurés et vérifiés. Vous avez l'esprit tranquille, chez vous !" },
              { emoji: "⚡", title: "Disponibilité rapide", desc: "Réservez en quelques clics pour une intervention sous 48h. Même en urgence, on est là." },
              { emoji: "💬", title: "Service client réactif et humain", desc: "Une question ? Un besoin particulier ? Notre équipe vous répond rapidement." },
              { emoji: "💶", title: "Avance immédiate du crédit d'impôt", desc: "50% pris en charge directement par l'État. Vous ne payez que la moitié, dès le départ." }
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{item.emoji}</div>
                <h3 className="font-bold text-slate-900 mb-2 leading-snug">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Processus */}
      <div className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Processus simple, rapide et efficace</h2>
          </div>
          <div className="space-y-6">
            {[
              { step: "1", title: "Vous choisissez", desc: "Décrivez vos besoins : ménage ponctuel, régulier, grand nettoyage ou repassage. Vous sélectionnez la date, l'heure et les options qui vous simplifient vraiment la vie.", tag: "Nettoie en un klic" },
              { step: "2", title: "On vous assigne un agent", desc: "Nous choisissons pour vous un agent de ménage fiable, expérimenté et proche de chez vous. Il prend contact avant la mission pour valider vos préférences.", tag: null },
              { step: "3", title: "On s'occupe de tout", desc: "Votre agent s'occupe du ménage selon vos consignes : nettoyage, rangement, repassage... Vous retrouvez un intérieur impeccable sans lever le petit doigt.", tag: null },
              { step: "4", title: "Vous ne payez qu'après", desc: "Payez uniquement quand tout est fait et validé. Pas d'engagement, pas de mauvaise surprise, vous gardez le contrôle à chaque étape.", tag: null }
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start bg-[#FCF5F8] rounded-2xl p-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#E95678] text-white flex items-center justify-center text-xl font-bold">{item.step}</div>
                <div>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-lg">Étape {item.step} — {item.title}</h3>
                    {item.tag && <span className="text-xs bg-[#E95678] text-white px-3 py-1 rounded-full font-medium">{item.tag}</span>}
                  </div>
                  <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to={createPageUrl('Booking')}>
              <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-8 py-3 font-semibold shadow-lg">Je réserve mon ménage</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
