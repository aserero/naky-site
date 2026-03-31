import React, { useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CleaningSuppliesDialog from './CleaningSuppliesDialog';

export default function StepStripeCard({ data, updateData, errors = {}, onCardReady, currentClient = null }) {
  const cardElementRef = useRef(null);
  const stripeRef = useRef(null);
  const cardRef = useRef(null);

  const [cardError, setCardError] = useState('');
  const [loadingStripe, setLoadingStripe] = useState(true);
  const [stripeInitError, setStripeInitError] = useState('');
  const [showSuppliesDialog, setShowSuppliesDialog] = useState(false);
  const [replaceSavedCard, setReplaceSavedCard] = useState(false);

  const hasSavedCard = !!currentClient?.stripe_payment_method_id;
  const shouldUseSavedCard = hasSavedCard && !replaceSavedCard;

  useEffect(() => {
    if (shouldUseSavedCard) {
      setLoadingStripe(false);
      setStripeInitError('');
      setCardError('');
      updateData({ _cardComplete: true, _stripeCard: null, _stripeInstance: null });
      if (onCardReady) onCardReady(null);
      return undefined;
    }

    let mounted = true;
    setLoadingStripe(true);

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

      const publishableKey =
        import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
        (await base44.functions.invoke('getStripePublishableKey', {})).data?.key;

      if (!publishableKey) {
        throw new Error("La cle Stripe n'est pas configuree.");
      }

      stripeRef.current = window.Stripe(publishableKey);
      if (!stripeRef.current) {
        throw new Error("Impossible d'initialiser Stripe.");
      }

      const clientEmail = data.contact_details?.email || data.email || currentClient?.email || '';
      const clientFirstName = data.contact_details?.first_name || data.first_name || currentClient?.first_name || '';
      const clientLastName = data.contact_details?.last_name || data.last_name || currentClient?.last_name || '';
      const clientName = `${clientFirstName} ${clientLastName}`.trim();

      const response = await base44.functions.invoke('createStripeSetupIntent', {
        clientEmail,
        clientName,
      });

      const { clientSecret: secret, customerId } = response.data;
      if (!secret) {
        throw new Error('Impossible de preparer le formulaire carte.');
      }

      if (mounted && onCardReady) {
        onCardReady({ customerId, setupClientSecret: secret });
      }

      if (mounted) {
        setLoadingStripe(false);
      }
    };

    initStripe().catch((err) => {
      if (!mounted) return;
      console.error('Stripe init error:', err);
      setStripeInitError(err?.message || 'Le formulaire de carte ne peut pas se charger pour le moment.');
      setLoadingStripe(false);
    });

    return () => {
      mounted = false;
      if (cardRef.current) {
        cardRef.current.destroy();
        cardRef.current = null;
      }
    };
  }, [
    shouldUseSavedCard,
    currentClient?.id,
    currentClient?.email,
    currentClient?.first_name,
    currentClient?.last_name,
    data.contact_details?.email,
    data.contact_details?.first_name,
    data.contact_details?.last_name,
    data.email,
    data.first_name,
    data.last_name,
  ]);

  useEffect(() => {
    if (shouldUseSavedCard || loadingStripe || !stripeRef.current || !cardElementRef.current || cardRef.current) return;

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
      updateData({
        _cardComplete: event.complete,
        _stripeCard: card,
        _stripeInstance: stripeRef.current,
      });
    });
  }, [shouldUseSavedCard, loadingStripe]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Dernieres informations</h2>
        <p className="text-slate-500">Avant de finaliser votre reservation</p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <Textarea
          placeholder="Instructions pour le menage (codes d'acces, precisions...)"
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
            Je confirme que j'ai tout le materiel necessaire.{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowSuppliesDialog(true);
              }}
              className="text-[#E95678] underline font-bold hover:text-[#d44565]"
            >
              Voir le detail du materiel
            </button>
          </Label>
        </div>
        {errors.has_cleaning_supplies && <p className="text-xs text-red-500">{errors.has_cleaning_supplies}</p>}
        <CleaningSuppliesDialog open={showSuppliesDialog} onClose={() => setShowSuppliesDialog(false)} />

        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <Label className="font-semibold text-slate-700">Enregistrement de votre carte bancaire</Label>
          </div>

          {shouldUseSavedCard ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4">
              <p className="text-sm font-semibold text-green-800">Empreinte bancaire deja enregistree</p>
              <p className="mt-1 text-xs text-green-700">
                Nous reutilisons la carte deja securisee sur votre compte. Vous n'avez pas besoin de la saisir a nouveau.
              </p>
              <button
                type="button"
                onClick={() => {
                  setReplaceSavedCard(true);
                  updateData({ _cardComplete: false, _stripeCard: null, _stripeInstance: null });
                }}
                className="mt-3 text-sm font-semibold text-[#E95678] underline underline-offset-4 hover:text-[#d44565]"
              >
                Remplacer ma carte
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-4">
                Aucun prelevement ne sera effectue maintenant. Votre carte est enregistree uniquement pour valider votre identite et faciliter les futures transactions.
              </p>

              {hasSavedCard && replaceSavedCard && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800">Nouvelle carte en cours d'enregistrement</p>
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceSavedCard(false);
                      setStripeInitError('');
                      setCardError('');
                      updateData({ _cardComplete: true, _stripeCard: null, _stripeInstance: null });
                      if (onCardReady) onCardReady(null);
                    }}
                    className="mt-2 text-sm font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-900"
                  >
                    Garder ma carte actuelle
                  </button>
                </div>
              )}

              {loadingStripe && (
                <div className="flex items-center justify-center h-12 bg-gray-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-400">Chargement du formulaire de paiement...</span>
                </div>
              )}

              {!loadingStripe && !stripeInitError && (
                <div
                  ref={cardElementRef}
                  className="p-3 border border-slate-200 rounded-lg bg-white min-h-[44px]"
                />
              )}

              {stripeInitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                  {stripeInitError} Verifie les cles Stripe et les fonctions Supabase.
                </div>
              )}

              {cardError && <p className="text-xs text-red-500 mt-2">{cardError}</p>}
              {errors._cardComplete && <p className="text-xs text-red-500 mt-2">{errors._cardComplete}</p>}
            </>
          )}

          <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
            <Lock className="w-3 h-3" />
            Paiement securise par Stripe. Vos donnees bancaires ne sont jamais stockees sur nos serveurs.
          </div>
        </div>
      </div>
    </div>
  );
}
