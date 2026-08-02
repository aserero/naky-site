import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { CONTACT, ZONE_LABEL } from '@/lib/constants';

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#ECF5F0]">
      {/* Hero */}
      <section className="bg-white py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Nous <span className="text-[#E95678]">contacter</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Une question ? Un besoin spécifique ? Notre équipe est disponible pour vous accompagner.
          </p>
        </div>
      </section>

      {/* Contacts */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href={CONTACT.phoneHref} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center gap-4 group">
            <div className="w-16 h-16 bg-[#E95678]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#E95678]/20 transition-colors">
              <Phone className="w-8 h-8 text-[#E95678]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Téléphone</h3>
              <p className="text-2xl font-semibold text-[#E95678]">{CONTACT.phone}</p>
              <p className="text-sm text-slate-500 mt-1">Appelez-nous directement</p>
            </div>
          </a>

          <a href={`mailto:${CONTACT.email}`} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center gap-4 group">
            <div className="w-16 h-16 bg-[#E95678]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#E95678]/20 transition-colors">
              <Mail className="w-8 h-8 text-[#E95678]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Email</h3>
              <p className="text-xl font-semibold text-[#E95678]">{CONTACT.email}</p>
              <p className="text-sm text-slate-500 mt-1">Réponse sous 24h</p>
            </div>
          </a>

          <div className="bg-white rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Zone d'intervention</h3>
              <p className="text-slate-700 font-medium">{ZONE_LABEL}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Horaires</h3>
              <p className="text-slate-700 font-medium">Lun – Ven : 9h – 19h</p>
              <p className="text-sm text-slate-500 mt-1">Samedi : 9h – 14h</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-6 bg-white text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Prêt à réserver votre ménage ?</h2>
        <p className="text-slate-600 mb-6">En quelques clics, c'est simple et sans engagement.</p>
        <Link to="/Booking">
          <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-10 py-3 text-lg shadow-lg">
            Réserver maintenant
          </Button>
        </Link>
      </section>
    </div>
  );
}