// Constantes métier Naky — source de vérité unique.
// Toute règle tarifaire / zone / créneau se change ICI et nulle part ailleurs.

export const HOURLY_RATES = {
  regular: 26,
  one_time: 29,
  spring: 32,
};

export const SERVICE_LABELS = {
  regular: 'Ménage régulier',
  one_time: 'Ménage ponctuel',
  spring: 'Nettoyage de printemps',
  enterprise: 'Entreprise',
};

export const RECURRENCE_LABELS = {
  none: 'Aucune',
  weekly: 'Toutes les semaines',
  twice_weekly: '2 fois par semaine',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Une fois par mois',
};

export const BOOKING_STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export const BILLING_STATUS_LABELS = {
  none: '—',
  avance_immediate: 'Avance immédiate',
  generated: 'Générée',
  paid: 'Réglée',
};

// Cycle "dossier avance immédiate" du client (clients.ai_status)
export const AI_STATUS_LABELS = {
  none: 'Aucune demande',
  pending: 'Dossier en attente',
  completed: 'Dossier complet — AI à demander',
  ai_requested: 'Demande AI en cours',
  ai_accepted: 'Avance immédiate acceptée',
  ai_refused: 'Avance immédiate refusée',
};

// Départements couverts (préfixes de code postal)
export const ALLOWED_ZIP_PREFIXES = ['75', '92', '93', '94'];
export const ZONE_LABEL = 'Paris (75) et les départements 92, 93 et 94';

export const isZipAllowed = (zipcode) =>
  ALLOWED_ZIP_PREFIXES.some((d) => (zipcode || '').startsWith(d));

// Durées proposées au client (funnel) — en minutes
export const CLIENT_DURATIONS_MIN = [120, 150, 180, 210, 240, 270, 300, 330, 360, 420];
// Durées proposées côté admin (plus permissif)
export const ADMIN_DURATIONS_MIN = [60, 90, 120, 150, 180, 240, 300, 360, 480];

// Créneaux horaires client : 8h → 20h, heure pile (format HH:MM, aligné sur le type time SQL)
export const CLIENT_TIME_SLOTS = Array.from({ length: 13 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`);
// Créneaux admin : 07:00 → 18:30 par pas de 30 min
export const ADMIN_TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const h = 7 + Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
});

// Délai minimum de réservation (jours calendaires)
export const MIN_BOOKING_LEAD_DAYS = 2;

export const TAX_CREDIT_RATE = 0.5;

export const CONTACT = {
  email: 'contact@naky.fr',
  phone: '07 56 98 60 01',
  phoneHref: 'tel:0756986001',
};

export const COMPANY = {
  name: 'SAS JULI',
  brand: 'Naky',
  address: '11 rue François Ponsard, 75016 Paris',
};

// Bloc émetteur des factures (source : facture Abby F-2026-0033)
export const INVOICE_ISSUER = {
  legal: 'JULI SAS',
  brand: 'NAKY',
  contact: 'Julia Serero',
  email: 'contact@naky.fr',
  phone: '+33 6 27 08 22 97',
  addressLine1: '11 RUE FRANCOIS PONSARD',
  addressLine2: '75016 Paris France',
  siret: '94087474600016',
  capital: '1 000,00 €',
  bank: {
    name: 'Crédit Agricole',
    iban: 'FR76 1220 6044 0056 0391 8411 261',
    bic: 'AGRIFRPP822',
  },
  paymentTerms: [
    ['Délai de paiement', 'À la réception'],
    ['Pénalité de retard', '3 fois le taux légal'],
    ['Indemnité forfaitaire pour frais de recouvrement', '40 €'],
    ['Escompte', "Pas d'escompte en cas de paiement anticipé"],
    ['Moyens de paiement', 'Virement'],
  ],
  vatExemptMention: 'TVA non applicable, art. 293 B du CGI',
};

// Charte facture (couleurs extraites du modèle Abby)
export const INVOICE_COLORS = {
  green: [142, 182, 149],   // #8EB695 — bandeaux, titre
  navy: [37, 55, 93],       // #25375D — titres et textes forts
  badgeBg: [213, 246, 235], // #D5F6EB — pastille "Payé"
  badgeText: [24, 138, 96],
  text: [55, 65, 81],
  muted: [130, 140, 155],
  lightLine: [225, 228, 233],
};

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Prix d'une prestation. duration en minutes. Retourne un nombre en euros (2 décimales).
export function computePrice(serviceType, durationMinutes) {
  const rate = HOURLY_RATES[serviceType];
  if (!rate || !durationMinutes) return 0;
  return Math.round(rate * (durationMinutes / 60) * 100) / 100;
}
