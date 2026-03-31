import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BRAND = {
  name: 'Naky',
  supportEmail: 'contact@naky.fr',
  siteUrl: 'https://naky-site.vercel.app',
};

const SERVICE_LABELS = {
  regular: 'Menage regulier',
  one_time: 'Menage ponctuel',
  spring: 'Nettoyage de printemps',
  enterprise: 'Entretien entreprise',
};

function formatEuros(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatBookingDateLabel(dateValue, timeValue) {
  if (!dateValue) return '—';

  try {
    const formattedDate = format(new Date(dateValue), 'EEEE d MMMM yyyy', { locale: fr });
    return timeValue ? `${formattedDate} a ${timeValue}` : formattedDate;
  } catch {
    return timeValue ? `${dateValue} a ${timeValue}` : String(dateValue);
  }
}

function renderEmailLayout({ eyebrow, title, intro, sections = [], ctaLabel, ctaUrl, footerNote }) {
  const renderedSections = sections
    .filter(Boolean)
    .map(
      (section) => `
        <div style="background:#f8fbfd;border:1px solid #e6edf4;border-radius:18px;padding:18px 20px;margin:0 0 14px;">
          ${section}
        </div>
      `,
    )
    .join('');

  return `
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#102147;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#ffffff;border:1px solid #e1e8f0;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(16,33,71,0.08);">
          <div style="padding:28px 28px 18px;text-align:center;background:linear-gradient(180deg,#eef6ef 0%,#ffffff 100%);">
            <div style="font-size:34px;font-weight:700;letter-spacing:0.04em;color:#d7607d;">NAKY</div>
            <div style="margin-top:6px;font-size:13px;color:#6b7a90;">Nettoie en un clic.</div>
          </div>
          <div style="padding:8px 28px 32px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#48a953;">
              ${eyebrow}
            </p>
            <h1 style="margin:0 0 16px;font-size:34px;line-height:1.05;font-weight:700;color:#102147;">
              ${title}
            </h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#5f718e;">
              ${intro}
            </p>
            ${renderedSections}
            ${
              ctaLabel && ctaUrl
                ? `
              <div style="margin:24px 0 18px;text-align:center;">
                <a href="${ctaUrl}" style="display:inline-block;background:#d7607d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 24px;border-radius:999px;">
                  ${ctaLabel}
                </a>
              </div>
            `
                : ''
            }
            <p style="margin:12px 0 0;font-size:13px;line-height:1.8;color:#8a9ab4;">
              ${footerNote || `Besoin d'aide ? Ecris-nous a ${BRAND.supportEmail}.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bookingSummarySection(booking = {}) {
  return `
    <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Reference :</strong> ${booking.reference || '—'}</p>
    <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Prestation :</strong> ${booking.serviceLabel || 'Menage a domicile'}</p>
    <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Date :</strong> ${booking.dateLabel || '—'}</p>
    <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Duree :</strong> ${booking.durationLabel || '—'}</p>
    <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Adresse :</strong> ${booking.addressLabel || '—'}</p>
    <p style="margin:0;font-size:14px;color:#5f718e;"><strong>Montant :</strong> ${formatEuros(booking.amount)}</p>
  `;
}

export function buildBookingEmailPayload({
  booking = {},
  serviceLabel,
  amount,
  invoiceUrl,
} = {}) {
  const addressLabel = [booking.address, booking.zipcode || booking.cp, booking.city].filter(Boolean).join(', ');
  return {
    reference: booking.ref || booking.id || '',
    serviceLabel: serviceLabel || SERVICE_LABELS[booking.service_type || booking.service_id] || 'Menage a domicile',
    dateLabel: formatBookingDateLabel(booking.date, booking.time),
    durationLabel: booking.duration || '—',
    addressLabel: addressLabel || '—',
    amount: amount ?? booking.total_price ?? booking.price_ht ?? 0,
    invoiceUrl: invoiceUrl || booking.invoice_file_url || '',
  };
}

export function bookingConfirmationEmail({
  clientName = 'Bonjour',
  booking = {},
} = {}) {
  return {
    subject: `Votre reservation Naky est bien enregistree - ${booking.reference || ''}`.trim(),
    html: renderEmailLayout({
      eyebrow: 'Reservation confirmee',
      title: `Merci ${clientName}`,
      intro:
        'Nous avons bien enregistre votre demande de menage. Notre equipe vous confirme la reservation tres rapidement.',
      sections: [
        bookingSummarySection(booking),
        `
          <p style="margin:0;font-size:14px;color:#5f718e;">
            Votre carte bancaire a ete enregistree en empreinte uniquement. Aucun prelevement n'est effectue maintenant.
          </p>
        `,
      ],
      ctaLabel: 'Acceder a mon espace',
      ctaUrl: `${BRAND.siteUrl}/compte`,
    }),
  };
}

export function agentAssignedEmail({
  clientName = 'Bonjour',
  booking = {},
  agent = {},
} = {}) {
  return {
    subject: `Votre intervenant Naky est assigne - ${booking.reference || ''}`.trim(),
    html: renderEmailLayout({
      eyebrow: 'Agent assigne',
      title: 'Votre menage est confirme',
      intro: `${clientName}, votre intervenant a bien ete assigne. Votre rendez-vous est pret.`,
      sections: [
        bookingSummarySection(booking),
        `
          <p style="margin:0 0 10px;font-size:14px;color:#5f718e;"><strong>Intervenant :</strong> ${agent.name || '—'}</p>
          <p style="margin:0;font-size:14px;color:#5f718e;"><strong>Telephone :</strong> ${agent.phone || '—'}</p>
        `,
      ],
      ctaLabel: 'Voir ma reservation',
      ctaUrl: `${BRAND.siteUrl}/compte`,
    }),
  };
}

export function dayBeforeReminderEmail({
  clientName = 'Bonjour',
  booking = {},
} = {}) {
  return {
    subject: `Rappel : votre menage Naky a lieu demain - ${booking.reference || ''}`.trim(),
    html: renderEmailLayout({
      eyebrow: 'Rappel de rendez-vous',
      title: 'Votre menage a lieu demain',
      intro: `${clientName}, nous vous rappelons que votre prestation Naky est prevue demain.`,
      sections: [
        bookingSummarySection(booking),
        `
          <p style="margin:0;font-size:14px;color:#5f718e;">
            Pensez a laisser l'acces au logement et a preparer les informations utiles pour l'intervenant.
          </p>
        `,
      ],
      ctaLabel: 'Voir le detail',
      ctaUrl: `${BRAND.siteUrl}/compte`,
    }),
  };
}

export function cleaningCompletedEmail({
  clientName = 'Bonjour',
  booking = {},
  invoiceUrl = '',
} = {}) {
  return {
    subject: `Votre menage Naky est termine - ${booking.reference || ''}`.trim(),
    html: renderEmailLayout({
      eyebrow: 'Prestation terminee',
      title: 'Votre menage est termine',
      intro: `${clientName}, votre prestation a bien ete realisee. Merci pour votre confiance.`,
      sections: [
        bookingSummarySection(booking),
        `
          <p style="margin:0;font-size:14px;color:#5f718e;">
            Si tout s'est bien passe, votre facture sera disponible dans votre espace client.
          </p>
        `,
      ],
      ctaLabel: invoiceUrl ? 'Voir ma facture' : 'Acceder a mon espace',
      ctaUrl: invoiceUrl || `${BRAND.siteUrl}/compte`,
      footerNote: "Une remarque sur la prestation ? Reponds directement a cet email ou contacte notre equipe.",
    }),
  };
}

export const emailTemplateCatalog = [
  {
    key: 'booking_confirmation',
    label: 'Confirmation de reservation',
    description: "Envoye juste apres la creation d'une reservation.",
  },
  {
    key: 'agent_assigned',
    label: 'Agent assigne',
    description: "Envoye quand un intervenant est attribue a la reservation.",
  },
  {
    key: 'day_before_reminder',
    label: 'Rappel veille du menage',
    description: 'Envoye la veille de la prestation.',
  },
  {
    key: 'cleaning_completed',
    label: 'Menage termine',
    description: 'Envoye quand la prestation est marquee comme terminee.',
  },
];
