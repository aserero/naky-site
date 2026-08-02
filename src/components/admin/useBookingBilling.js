import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invokeFunction } from '@/api/functions';
import { getSignedUrl, BUCKETS } from '@/api/storage';
import { formatPrice } from '@/lib/format';

// Hook partagé AdminBookings / AdminCalendar : paiement + facturation.
// Toute la logique webhook Make / upload PDF / création Invoice vit côté serveur
// (Edge Functions charge-client et bill-booking) — le front ne fait qu'invoquer.
export function useBookingBilling() {
  const queryClient = useQueryClient();
  const [chargingBookingId, setChargingBookingId] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  // Prélèvement Stripe puis facturation (le serveur passe le booking en completed,
  // renseigne payment_method, génère la facture et crée l'Invoice).
  const chargeStripe = async (booking) => {
    setChargingBookingId(booking.id);
    try {
      await invokeFunction('charge-client', { bookingId: booking.id });
      await invokeFunction('bill-booking', { bookingId: booking.id, paymentType: 'stripe' });
      toast.success(`Paiement de ${formatPrice(booking.total_price)} effectué avec succès`);
    } catch (err) {
      toast.error(err.message || 'Erreur lors du prélèvement');
    } finally {
      // Invalider même en cas d'échec partiel (le prélèvement a pu aboutir sans la facture)
      invalidate();
      setChargingBookingId(null);
    }
  };

  // Paiement URSSAF (avance immédiate) : facturation seule côté serveur.
  const payUrssaf = async (booking) => {
    try {
      await invokeFunction('bill-booking', { bookingId: booking.id, paymentType: 'urssaf' });
      toast.success('Demande de paiement URSSAF envoyée');
    } catch (err) {
      toast.error(err.message || 'Erreur lors du paiement URSSAF');
    } finally {
      invalidate();
    }
  };

  // Ouvre la facture PDF (bucket privé "invoices" → URL signée).
  const openInvoice = async (booking) => {
    try {
      const url = await getSignedUrl(BUCKETS.invoices, booking.invoice_file_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err.message || "Impossible d'ouvrir la facture");
    }
  };

  return { chargeStripe, payUrssaf, openInvoice, chargingBookingId };
}
