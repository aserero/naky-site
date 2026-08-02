import React from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, ShoppingBag, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HOURLY_RATES, SERVICE_LABELS, TAX_CREDIT_RATE, computePrice } from '@/lib/constants';
import { formatDuration, formatTime, formatPrice } from '@/lib/format';

export default function CartSummary({ bookingData, step, currentClient, onUpdate }) {
  const rate = HOURLY_RATES[bookingData.service_type];
  const price = computePrice(bookingData.service_type, bookingData.duration_minutes);
  const shouldShowTaxCredit = currentClient?.urssaf_completed || bookingData.advance_immediate;
  const taxCredit = shouldShowTaxCredit ? Math.round(price * TAX_CREDIT_RATE * 100) / 100 : 0;
  const finalPrice = Math.round((price - taxCredit) * 100) / 100;

  return (
    <Card className="bg-white border-none shadow-xl rounded-2xl p-6 sticky top-24">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5" /> Mon panier
      </h2>

      <div className="space-y-6">
        {/* Address Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <MapPin className="w-4 h-4" /> Adresse
          </div>
          {bookingData.address ? (
            <div className="text-sm text-slate-600 pl-6">
              <p>{bookingData.address}</p>
              <p>{bookingData.zipcode} {bookingData.city}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 pl-6 italic">En attente...</p>
          )}
        </div>

        {/* Service Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <ShoppingBag className="w-4 h-4" /> Ménage
          </div>
          <div className="pl-6 space-y-3">
             <div className="flex justify-between text-sm">
                <span className="text-slate-600">{SERVICE_LABELS[bookingData.service_type] || ''}</span>
                {rate && <span className="font-medium text-slate-400">{rate}€/h</span>}
             </div>
             {bookingData.has_animals && (
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Présence d'animaux</span>
                 </div>
             )}
             {bookingData.duration_minutes && (
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Durée: {formatDuration(bookingData.duration_minutes)}</span>
                 </div>
             )}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Pricing */}
        <div className="space-y-2">
            {shouldShowTaxCredit && price > 0 ? (
              <>
                <div className="flex justify-between text-sm text-slate-400">
                    <span>Prix total</span>
                    <span className="line-through">{formatPrice(price)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                    <span>Crédit d'impôt 50%</span>
                    <span>-{formatPrice(taxCredit)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#E95678] pt-2">
                    <span>Après crédit d'impôt</span>
                    <span>{formatPrice(finalPrice)}/session</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm font-bold pt-2">
                  <span>Total</span>
                  <span>{price > 0 ? `${formatPrice(price)}/session` : '0€/session'}</span>
              </div>
            )}
            <p className="text-[10px] text-right text-slate-400">Frais de service inclus.</p>
        </div>

        {/* Date Section */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <Clock className="w-4 h-4" /> Date
          </div>
          {bookingData.date ? (
            <div className="text-sm text-slate-600 pl-6">
              <p className="capitalize">
                {format(new Date(bookingData.date), 'EEEE d MMMM yyyy', { locale: fr })}
                {bookingData.start_time && `, à ${formatTime(bookingData.start_time)}`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 pl-6 italic">Choisir une date</p>
          )}
        </div>

      </div>
    </Card>
  );
}
