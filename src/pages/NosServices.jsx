import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Repeat, Sparkles, Leaf, Building2, CheckCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';

const services = [
  {
    icon: Repeat,
    title: "Ménage régulier",
    subtitle: "Toutes les semaines ou toutes les deux semaines",
    description: "La solution idéale pour maintenir un intérieur propre au quotidien. Votre agent intervient selon la fréquence choisie : toutes les semaines, toutes les deux semaines ou deux fois par semaine.",
    features: ["Dépoussiérage complet", "Nettoyage des sols", "Salle de bain & cuisine", "Rangement et entretien courant"],
    color: "bg-pink-50 border-pink-100",
    iconColor: "text-[#E95678]",
    iconBg: "bg-[#E95678]/10",
  },
  {
    icon: Sparkles,
    title: "Ménage ponctuel",
    subtitle: "Une intervention unique, quand vous en avez besoin",
    description: "Besoin d'un coup de propre avant un événement, après un déménagement, ou juste parce que vous en avez besoin ? Notre équipe intervient une seule fois, sans engagement.",
    features: ["Intervention sur mesure", "Sans abonnement", "Disponible rapidement", "Adapté à vos besoins"],
    color: "bg-purple-50 border-purple-100",
    iconColor: "text-purple-500",
    iconBg: "bg-purple-100",
  },
  {
    icon: Leaf,
    title: "Grand ménage de printemps",
    subtitle: "Un nettoyage en profondeur de A à Z",
    description: "Un nettoyage complet et approfondi de votre logement. Idéal une à deux fois par an pour remettre tout à plat : intérieurs d'armoires, vitres, recoins oubliés…",
    features: ["Nettoyage intérieur des meubles", "Vitres et miroirs", "Zones difficiles d'accès", "Cuisine et appareils ménagers"],
    color: "bg-green-50 border-green-100",
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
  },
  {
    icon: Building2,
    title: "Ménage entreprise",
    subtitle: "Pour bureaux et locaux professionnels",
    description: "Nous prenons en charge l'entretien de vos locaux professionnels. Un environnement de travail propre booste la productivité et donne une image soignée à vos visiteurs.",
    features: ["Bureaux et open spaces", "Salles de réunion", "Sanitaires", "Fréquence sur mesure"],
    color: "bg-blue-50 border-blue-100",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-100",
  },
];

export default function NosServices() {
  return (
    <div className="min-h-screen bg-[#ECF5F0]">
      {/* Hero */}
      <section className="bg-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Nos <span className="text-[#E95678]">services</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Que vous ayez besoin d'un entretien régulier ou d'une intervention exceptionnelle, Naky s'adapte à votre rythme de vie.
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

      {/* Services */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((s) => (
            <div key={s.title} className={`bg-white rounded-2xl border p-8 shadow-sm hover:shadow-md transition-shadow ${s.color}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${s.iconBg}`}>
                <s.icon className={`w-6 h-6 ${s.iconColor}`} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{s.title}</h3>
              <p className="text-sm text-slate-500 mb-3 font-medium">{s.subtitle}</p>
              <p className="text-slate-600 mb-5 leading-relaxed">{s.description}</p>
              <ul className="space-y-2">
                {s.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-[#E95678] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Avantages communs */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Avec tous nos services, vous bénéficiez de :</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {["Agents vérifiés", "Paiement sécurisé", "Crédit d'impôt 50%", "Satisfaction garantie"].map((item) => (
              <div key={item} className="flex flex-col items-center gap-2 p-4 bg-[#ECF5F0] rounded-xl">
                <CheckCircle className="w-8 h-8 text-[#E95678]" />
                <span className="text-slate-800 font-medium text-sm text-center">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Trouvez la formule qui vous convient</h2>
        <p className="text-slate-600 mb-6">Réservez en quelques clics, sans engagement.</p>
        <Link to="/Booking">
          <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-10 py-3 text-lg shadow-lg">
            Réserver maintenant
          </Button>
        </Link>
      </section>
    </div>
  );
}