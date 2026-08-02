import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Heart, Shield, Clock } from 'lucide-react';
import { ZONE_LABEL } from '@/lib/constants';

export default function APropos() {
  return (
    <div className="min-h-screen bg-[#ECF5F0]">
      {/* Hero */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Simplifiez votre quotidien avec <span className="text-[#E95678]">Naky</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Naky, c'est le service de ménage à domicile pensé pour vous : rapide, fiable et humain. Nous connectons les particuliers avec des agents de ménage professionnels sur {ZONE_LABEL} — en quelques clics seulement.
          </p>
          <div className="mt-8">
            <Link to="/Booking">
              <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-8 py-3 text-lg shadow-lg">
                Réserver maintenant
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Notre histoire */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">
            Une nouvelle façon de vivre le ménage
          </h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-4 text-slate-600 leading-relaxed text-lg">
            <p>
              Nous avons créé Naky avec une idée simple : rendre les services de ménage aussi accessibles et transparents que possible.
            </p>
            <p>
              Fini les démarches compliquées, les surprises de dernière minute ou les plateformes impersonnelles.
            </p>
            <p>
              Avec Naky, vous bénéficiez d'un accompagnement humain, d'agents de confiance, et d'un service 100% flexible, du premier clic jusqu'à la dernière touche de propreté. Notre mission : alléger votre charge mentale, tout en valorisant un métier essentiel.
            </p>
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            Des valeurs humaines au cœur de chaque intervention
          </h2>
          <p className="text-center text-slate-500 mb-10 text-lg">
            Chez Naky, chaque intervention repose sur trois piliers :
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {[
              { icon: Shield, label: "Agents sélectionnés et compétents" },
              { icon: Clock, label: "Horaires flexibles" },
              { icon: Heart, label: "Sans engagement" },
              { icon: CheckCircle, label: "50% d'avance immédiate du crédit d'impôt" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-4 bg-[#ECF5F0] rounded-xl p-5">
                <div className="bg-[#E95678]/10 p-3 rounded-full">
                  <Icon className="w-6 h-6 text-[#E95678]" />
                </div>
                <span className="text-slate-800 font-medium text-lg">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-lg leading-relaxed text-center max-w-3xl mx-auto">
            Nous croyons que la confiance est la clé : pour nos clients comme pour nos agents. C'est pourquoi nous mettons autant d'efforts dans l'expérience utilisateur que dans la relation de proximité. Avec Naky, vous n'êtes jamais un simple numéro. Vous êtes accompagné, écouté, et respecté.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Prêt à simplifier votre quotidien ?</h2>
        <Link to="/Booking">
          <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-10 py-3 text-lg shadow-lg">
            Réserver mon premier ménage
          </Button>
        </Link>
      </section>
    </div>
  );
}