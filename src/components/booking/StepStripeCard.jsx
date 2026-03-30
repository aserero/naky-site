import React, { useState, useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lock, CreditCard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CleaningSuppliesDialog from './CleaningSuppliesDialog';

export default function StepStripeCard({ data, updateData, errors = {}, onCardReady }) {
  const cardElementRef = useRef(null);
  const stripeRef = useRef(null);
  const cardRef = useRef(null);
  const [cardError, setCardError] = useState('');
  const [cardComplete, setCardComplete] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [stripeInitError, setStripeInitError] = useState('');
  const [showSuppliesDialog, setShowSuppliesDialog] = useState(false);

  // Load Stripe and create SetupIntent
  useEffect(() => {
    const initStripe = async () => {
      if (!window.Stripe) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
        (await base44.functions.invoke('getStripePublishableKey', {})).data?.key;

      if (!publishableKey) {
        throw new Error("La clé Stripe n'est pas configurée.");
      }

      stripeRef.current = window.Stripe(publishableKey);
      if (!stripeRef.current) {
        throw new Error("Impossible d'initialiser Stripe.");
      }

      const clientEmail = data.contact_details?.email || data.email || '';
      const clientName = `${data.contact_details?.first_name || data.first_name || ''} ${data.contact_details?.last_name || data.last_name || ''}`.trim();

      const response = await base44.functions.invoke('createStripeSetupIntent', {
        clientEmail,
        clientName,
      });

      const { clientSecret: secret, customerId } = response.data;
      if (!secret) {
        throw new Error("Impossible de préparer le formulaire carte.");
      }
      setClientSecret(secret);

      if (onCardReady) onCardReady({ customerId, setupClientSecret: secret });

      setLoadingStripe(false);
    };

    initStripe().catch(err => {
      console.error('Stripe init error:', err);
      setStripeInitError(err?.message || "Le formulaire de carte ne peut pas se charger pour le moment.");
      setLoadingStripe(false);
    });

    return () => {
      if (cardRef.current) cardRef.current.destroy();
    };
  }, []);

  // Mount card element only after loading is done and the DOM node is available
  useEffect(() => {
    if (loadingStripe || !stripeRef.current || !cardElementRef.current || cardRef.current) return;

    const elements = stripeRef.current.elements();
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

    cardRef.current = card;
    card.mount(cardElementRef.current);

    card.on('change', (event) => {
      setCardError(event.error ? event.error.message : '');
      setCardComplete(event.complete);
      updateData({ _cardComplete: event.complete, _stripeCard: card, _stripeInstance: stripeRef.current });
    });
  }, [loadingStripe]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Dernières informations</h2>
        <p className="text-slate-500">Avant de finaliser votre réservation</p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <Textarea
          placeholder="Instructions pour le ménage (codes d'accès, précisions...)"
          value={data.instructions || ''}
          onChange={(e) => updateData({ instructions: e.target.value })}
          className="bg-white border-slate-200 min-h-[100px]"
        />

        <div className={`flex items-start space-x-2 ${errors.has_cleaning_supplies ? 'text-red-500' : ''}`}>
          <Checkbox
            id="cleaning_supplies"
            checked={data.has_cleaning_supplies}
            onCheckedChange={(checked) => updateData({ has_cleaning_supplies: checked })}
          />
          <Label htmlFor="cleaning_supplies" className="cursor-pointer text-sm leading-tight">
            Je confirme que j'ai tout le matériel nécessaire.{' '}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setShowSuppliesDialog(true); }}
              className="text-[#E95678] underline font-bold hover:text-[#d44565]"
            >
              Voir le détail du matériel
            </button>
          </Label>
        </div>
        {errors.has_cleaning_supplies && <p className="text-xs text-red-500">{errors.has_cleaning_supplies}</p>}
        <CleaningSuppliesDialog open={showSuppliesDialog} onClose={() => setShowSuppliesDialog(false)} />

        {/* Stripe Card */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <Label className="font-semibold text-slate-700">Enregistrement de votre carte bancaire</Label>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Aucun prélèvement ne sera effectué maintenant. Votre carte est enregistrée uniquement pour valider votre identité et faciliter les futures transactions.
          </p>

          {loadingStripe && (
            <div className="flex items-center justify-center h-12 bg-gray-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-400">Chargement du formulaire de paiement...</span>
            </div>
          )}
          {!stripeInitError && (
            <div
              ref={cardElementRef}
              className={`p-3 border border-slate-200 rounded-lg bg-white min-h-[44px] ${loadingStripe ? 'hidden' : ''}`}
            />
          )}

          {stripeInitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
              {stripeInitError} Vérifie les clés Stripe et les fonctions Supabase.
            </div>
          )}
          {cardError && <p className="text-xs text-red-500 mt-2">{cardError}</p>}
          {errors._cardComplete && <p className="text-xs text-red-500 mt-2">{errors._cardComplete}</p>}

          <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
            <Lock className="w-3 h-3" />
            Paiement sécurisé par Stripe. Vos données bancaires ne sont jamais stockées sur nos serveurs.
          </div>
        </div>
      </div>
    </div>
  );
}
