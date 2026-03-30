import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Lock } from 'lucide-react';

export default function QuickStripeStep({ client, onUpdate, stripeRefs }) {
  const cardElementRef = useRef(null);
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [cardError, setCardError] = useState('');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      // Load Stripe.js if needed
      if (!window.Stripe) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Get publishable key
      const keyRes = await base44.functions.invoke('getStripePublishableKey', {});
      const stripe = window.Stripe(keyRes.data?.key);

      // Create SetupIntent
      const setupRes = await base44.functions.invoke('createStripeSetupIntent', {
        clientEmail: client.email,
        clientName: `${client.first_name} ${client.last_name}`,
      });
      const { clientSecret, customerId } = setupRes.data;

      // Store in parent refs
      if (stripeRefs) {
        stripeRefs.stripe = stripe;
        stripeRefs.clientSecret = clientSecret;
        stripeRefs.customerId = customerId;
      }

      // Mount card element
      const elements = stripe.elements();
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1e293b',
            fontFamily: 'system-ui, sans-serif',
            '::placeholder': { color: '#94a3b8' },
          },
          invalid: { color: '#e95678' },
        },
      });

      card.mount(cardElementRef.current);
      if (stripeRefs) stripeRefs.card = card;

      card.on('change', (event) => {
        setCardError(event.error ? event.error.message : '');
        onUpdate({ cardComplete: event.complete });
      });

      setLoadingStripe(false);
    };

    init().catch(err => {
      console.error('Stripe init error:', err);
      setLoadingStripe(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Enregistrement de votre carte</h3>
        <p className="text-slate-500 text-sm">
          Aucun prélèvement ne sera effectué maintenant. Votre carte est enregistrée pour faciliter vos futures réservations.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Informations bancaires</span>
        </div>

        {loadingStripe && (
          <div className="flex items-center justify-center h-12 bg-gray-50 rounded-lg border border-slate-200">
            <span className="text-sm text-slate-400">Chargement du formulaire de paiement...</span>
          </div>
        )}

        {/* Always in DOM so Stripe can mount into it */}
        <div
          ref={cardElementRef}
          className={`p-3 border border-slate-200 rounded-lg bg-white min-h-[44px] ${loadingStripe ? 'hidden' : ''}`}
        />

        {cardError && <p className="text-xs text-red-500">{cardError}</p>}

        <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
          <Lock className="w-3 h-3" />
          Paiement sécurisé par Stripe. Vos données bancaires ne sont jamais stockées sur nos serveurs.
        </div>
      </div>
    </div>
  );
}