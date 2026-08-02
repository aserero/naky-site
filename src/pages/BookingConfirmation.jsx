import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, MapPin, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { SERVICE_LABELS } from '@/lib/constants';
import { formatDuration, formatTime, formatPrice } from '@/lib/format';

export default function BookingConfirmation() {
  const { currentClient } = useAuth();
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Get booking details from localStorage (written by the funnel), then clear the key
    const savedDetails = localStorage.getItem('naky_last_booking');
    if (savedDetails) {
      try {
        setBookingDetails(JSON.parse(savedDetails));
      } catch (e) {
        // récap illisible : on affiche la page sans détail
      }
      localStorage.removeItem('naky_last_booking');
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Réservation confirmée !</h1>
        <p className="text-slate-600">
          Votre demande de ménage a bien été enregistrée. Vous recevrez une confirmation par email sous peu.
        </p>
      </div>

      {bookingDetails && (
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Récapitulatif de votre réservation</h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Home className="w-5 h-5 text-[#E95678] mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">{SERVICE_LABELS[bookingDetails.service_type] || bookingDetails.service_type}</p>
                  <p className="text-sm text-slate-600">Durée : {formatDuration(bookingDetails.duration_minutes)}</p>
                </div>
              </div>

              {bookingDetails.date && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#E95678] mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">Date et heure</p>
                    <p className="text-sm text-slate-600">
                      {new Date(bookingDetails.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {bookingDetails.start_time && ` à ${formatTime(bookingDetails.start_time)}`}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#E95678] mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Adresse</p>
                  <p className="text-sm text-slate-600">
                    {bookingDetails.address}<br />
                    {bookingDetails.zipcode} {bookingDetails.city}
                  </p>
                </div>
              </div>

              {bookingDetails.total_price && (
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-900">Total</span>
                    <span className="text-2xl font-bold text-[#E95678]">{formatPrice(bookingDetails.total_price)}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {currentClient ? (
          <Link to={createPageUrl('UserDashboard')}>
            <Button className="bg-[#E95678] hover:bg-[#d44565] text-white w-full sm:w-auto">
              Voir mes réservations
            </Button>
          </Link>
        ) : (
          <Link to={createPageUrl('Connexion')}>
            <Button className="bg-[#E95678] hover:bg-[#d44565] text-white w-full sm:w-auto">
              Se connecter
            </Button>
          </Link>
        )}
        <Link to={createPageUrl('Booking')}>
          <Button variant="outline" className="w-full sm:w-auto">
            Nouvelle réservation
          </Button>
        </Link>
      </div>
    </div>
  );
}
