const routeMap: Record<string, string> = {
  Home: '/',
  APropos: '/a-propos',
  Contact: '/contact',
  CreditImpot: '/credit-impot',
  NosServices: '/services',
  Partenaire: '/devenir-partenaire',
  Booking: '/reservation',
  BookingConfirmation: '/reservation/confirmee',
  Connexion: '/connexion',
  Inscription: '/inscription',
  UserDashboard: '/compte',
  UrssafForm: '/urssaf',
  Admin: '/admin',
  AdminBookings: '/admin/menages',
  AdminCalendar: '/admin/calendrier',
  AdminClients: '/admin/clients',
  AdminEmployees: '/admin/employees',
  AdminInvoices: '/admin/factures',
  AdminCandidatures: '/admin/candidatures',
};

export function createPageUrl(pageName: string) {
  return routeMap[pageName] || '/' + pageName.replace(/ /g, '-').toLowerCase();
}
