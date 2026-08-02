import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
import { Button } from '@/components/ui/button';
import { User, LogOut, Menu, X, Phone, Mail } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthContext';
import { CONTACT, COMPANY, ZONE_LABEL } from '@/lib/constants';

const navLinks = [
  { label: 'Accueil', path: '/Home' },
  { label: 'À propos', path: '/APropos' },
  { label: 'Nos services', path: '/NosServices' },
  { label: "Crédit d'impôt", path: '/CreditImpot' },
  { label: 'Contact', path: '/Contact' },
  { label: 'Devenir partenaire', path: '/Partenaire' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentClient, logout } = useAuth();

  const handleLogin = () => {
    window.location.href = createPageUrl('Connexion');
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <>
    <ScrollToTop />
    <div className="min-h-screen font-sans text-slate-900 bg-[#ECF5F0] flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-1 flex justify-between items-center">
          {/* Logo */}
          <Link to="/Home" className="flex items-center flex-shrink-0">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699ece5a2c48b8cfd3773f8a/23f22a7c8_logo_square.png"
              alt="Naky"
              className="h-24 w-auto"
            />
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-[#E95678] bg-[#E95678]/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions desktop */}
          <div className="hidden md:flex items-center gap-3">
            {currentClient ? (
              <>
                <Link to={createPageUrl('UserDashboard')}>
                  <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-5 text-sm shadow-md">
                    Mon espace
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Se déconnecter">
                  <LogOut className="w-4 h-4 text-slate-500" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleLogin}>
                  <User className="w-4 h-4 mr-2" />
                  Me connecter
                </Button>
                <Link to={createPageUrl('Booking')}>
                  <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-5 text-sm shadow-md">
                    Réserver
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Burger mobile */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-[#E95678] bg-[#E95678]/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              {currentClient ? (
                <>
                  <Link to={createPageUrl('UserDashboard')} onClick={() => setMenuOpen(false)}>
                    <Button className="w-full bg-[#E95678] hover:bg-[#d44565] text-white rounded-full">Mon espace</Button>
                  </Link>
                  <Button variant="outline" className="w-full rounded-full" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Se déconnecter
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full rounded-full" onClick={handleLogin}>
                    <User className="w-4 h-4 mr-2" /> Me connecter
                  </Button>
                  <Link to={createPageUrl('Booking')} onClick={() => setMenuOpen(false)}>
                    <Button className="w-full bg-[#E95678] hover:bg-[#d44565] text-white rounded-full">Réserver</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#2d2d2d] text-slate-300 pt-12 pb-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699ece5a2c48b8cfd3773f8a/23f22a7c8_logo_square.png"
                alt="Naky"
                className="h-14 w-auto mb-4 brightness-0 invert"
              />
              <p className="text-sm leading-relaxed text-slate-400">
                Le service de ménage à domicile pensé pour vous : rapide, fiable et humain. {ZONE_LABEL}.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="text-white font-semibold mb-4">Navigation</h4>
              <ul className="space-y-2 text-sm">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="hover:text-[#E95678] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href={CONTACT.phoneHref} className="flex items-center gap-2 hover:text-[#E95678] transition-colors">
                    <Phone className="w-4 h-4" />
                    {CONTACT.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 hover:text-[#E95678] transition-colors">
                    <Mail className="w-4 h-4" />
                    {CONTACT.email}
                  </a>
                </li>
              </ul>
              <div className="mt-6">
                <Link to={createPageUrl('Booking')}>
                  <Button className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-6 text-sm">
                    Réserver maintenant
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-600 pt-6 text-center text-xs text-slate-400 flex flex-col md:flex-row items-center justify-center gap-3">
            <span>© {new Date().getFullYear()} {COMPANY.brand}. Tous droits réservés. — {COMPANY.name}</span>
            <span className="hidden md:inline text-slate-600">·</span>
            <Link to="/CGV" className="hover:text-[#E95678] transition-colors underline underline-offset-2">
              Conditions Générales de Vente
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}