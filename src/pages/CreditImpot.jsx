import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, BadgePercent } from 'lucide-react';
import { createPageUrl } from '@/utils';

const faqs = [
  {
    question: "1. L'attestation fiscale, c'est quoi ?",
    answer: `Les particuliers qui bénéficient de prestations d'aide à domicile, via une structure de services à la personne (SAP), peuvent profiter d'un avantage fiscal.

Chaque année, vous recevez une attestation fiscale de la part de votre prestataire de services : ce document est à conserver précieusement. Il vous permet de bénéficier d'un crédit d'impôt.

Ce crédit d'impôt concerne les personnes actives comme les retraités. Le montant s'élève à 50 % des dépenses engagées dans la limite de certains plafonds.`,
  },
  {
    question: "2. Qui peut délivrer une attestation fiscale ?",
    answer: `Seules les structures déclarées ou agréées "services à la personne" sont habilitées à vous remettre une attestation fiscale. Cela peut inclure :
• Les entreprises prestataires, qui emploient directement les intervenants et vous facturent leurs services ;
• Les entreprises mandataires, où vous êtes l'employeur mais bénéficiez d'une gestion administrative ;
• Les plateformes en ligne agréées, jouant un rôle d'intermédiaire entre vous et les professionnels.

Ces structures doivent impérativement respecter un cadre légal strict pour que leurs prestations ouvrent droit à l'avantage fiscal.`,
  },
  {
    question: "3. Comment obtenir mon attestation fiscale et où la trouver ?",
    answer: `La législation oblige ces entreprises à transmettre une attestation fiscale annuelle. Cette attestation vous est généralement envoyée entre janvier et mars de l'année suivante.

Elle est souvent :
• Envoyée par e-mail
• Téléchargeable directement sur votre espace personnel ou compte client
• Transmise en format papier par voie postale

Contenu de l'attestation fiscale :
• Identité du prestataire
• Vos informations (nom, adresse)
• Détail des services rendus
• Montant total payé et montant ouvrant droit au crédit d'impôt
• Mention de l'agrément ou de la déclaration SAP

Vérifiez que le montant indiqué correspond bien aux sommes réellement versées, hors aides (ex : APA, CESU préfinancé).

Vous avez utilisé un service de ménage en 2024 ?
L'attestation fiscale correspondante vous sera envoyée début 2025, récapitulant le total des montants payés ouvrant droit à crédit d'impôt.`,
  },
  {
    question: "4. À quoi sert l'attestation fiscale dans la déclaration d'impôt ?",
    answer: `L'attestation fiscale vous permet de bénéficier d'un crédit d'impôt de 50 % sur les dépenses engagées, dans la limite de :
• 12 000 € par an pour la majorité des services (soit un crédit d'impôt maximum de 6 000 €) ;
• 15 000 à 20 000 € dans certains cas (parents d'enfants handicapés, personnes de plus de 65 ans, etc.).

Lors de votre déclaration en ligne ou papier, vous devrez :
• Indiquer le montant total dans les cases 7DB, 7DF ou 7DQ, selon votre situation ;
• Joindre ou conserver l'attestation fiscale en cas de contrôle fiscal.

Même si vous n'êtes pas imposable, vous pouvez recevoir un remboursement du crédit d'impôt.

Conseil : Conservez toutes vos factures ou relevés mensuels pour faciliter la vérification.`,
  },
  {
    question: "5. Peut-on cumuler plusieurs attestations fiscales ?",
    answer: `Oui, c'est parfaitement autorisé.

Si vous avez eu recours à plusieurs prestataires différents dans l'année (ex : ménage + garde d'enfants + aide informatique), chacun vous transmettra une attestation distincte.

Lors de votre déclaration :
• Additionnez les montants des différentes attestations ;
• Joindre ou conserver l'attestation fiscale en cas de contrôle fiscal.

Gardez chaque document en cas de vérification par l'administration fiscale.`,
  },
  {
    question: "6. Existe-t-il d'autres aides cumulables avec le crédit d'impôt ?",
    answer: `Oui, plusieurs dispositifs peuvent réduire le reste à charge :
• L'APA (Allocation Personnalisée d'Autonomie) : aide pour les personnes âgées dépendantes ;
• Le CESU préfinancé : chèques emploi-service financés par l'employeur ou une caisse ;
• Les aides des caisses de retraite ou mutuelles, selon votre contrat.

Les montants pris en charge par ces aides ne doivent pas être inclus dans la base du crédit d'impôt (seuls les montants réellement payés par vous le sont).`,
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        className="w-full flex justify-between items-center text-left px-6 py-5 font-semibold text-slate-800 hover:bg-slate-50 transition-colors gap-4"
        onClick={() => setOpen(!open)}
      >
        <span>{question}</span>
        {open ? <ChevronUp className="w-5 h-5 text-[#E95678] flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-6 text-slate-600 leading-relaxed text-sm whitespace-pre-line border-t border-slate-100 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function CreditImpot() {
  return (
    <div className="min-h-screen bg-[#ECF5F0]">
      {/* Hero */}
      <section className="bg-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#E95678]/10 text-[#E95678] px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <BadgePercent className="w-4 h-4" />
            50% de crédit d'impôt
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Crédit d'impôt &<br /><span className="text-[#E95678]">Attestation fiscale</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Avec Naky, bénéficiez automatiquement du crédit d'impôt de 50% sur vos dépenses de ménage à domicile. Voici tout ce que vous devez savoir.
          </p>
          <div className="mt-8">
            <Link to="/Booking">
              <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-8 py-3 text-lg shadow-lg">
                Réserver et économiser 50%
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Key numbers */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { value: "50%", label: "Crédit d'impôt sur vos dépenses" },
            { value: "6 000€", label: "De crédit d'impôt max par an" },
            { value: "Tous", label: "Actifs et retraités concernés" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="text-4xl font-bold text-[#E95678] mb-2">{value}</div>
              <div className="text-slate-600">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-8 px-6 pb-16">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Questions fréquentes</h2>
          {faqs.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-6 bg-white text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Profitez du crédit d'impôt dès votre première intervention</h2>
        <Link to="/Booking">
          <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-10 py-3 text-lg shadow-lg">
            Réserver maintenant
          </Button>
        </Link>
      </section>
    </div>
  );
}