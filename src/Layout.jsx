import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, LogOut, Menu, X, Phone, Mail } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthContext';

const navLinks = [
  { label: 'Accueil', path: createPageUrl('Home') },
  { label: 'À propos', path: createPageUrl('APropos') },
  { label: 'Nos services', path: createPageUrl('NosServices') },
  { label: "Crédit d'impôt", path: createPageUrl('CreditImpot') },
  { label: 'Contact', path: createPageUrl('Contact') },
  { label: 'Devenir partenaire', path: createPageUrl('Partenaire') },
];

function LayoutContent({ children }) {
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
    <div className="flex min-h-screen flex-col bg-[#ECF5F0] font-sans text-slate-900">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1">
          <Link to={createPageUrl('Home')} className="flex flex-shrink-0 items-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699ece5a2c48b8cfd3773f8a/23f22a7c8_logo_square.png"
              alt="Naky"
              className="h-24 w-auto"
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'bg-[#E95678]/10 text-[#E95678]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {currentClient ? (
              <>
                <Link to={createPageUrl('Booking')}>
                  <Button variant="outline" className="rounded-full px-5 text-sm">
                    Réserver
                  </Button>
                </Link>
                <Link to={createPageUrl('UserDashboard')}>
                  <Button className="rounded-full bg-[#E95678] px-5 text-sm text-white shadow-md hover:bg-[#d44565]">
                    Mon espace
                  </Button>
                </Link>
                {currentClient.role === 'admin' && (
                  <Link to={createPageUrl('Admin')}>
                    <Button variant="outline" className="rounded-full px-5 text-sm">
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Se déconnecter">
                  <LogOut className="h-4 w-4 text-slate-500" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleLogin}>
                  <User className="mr-2 h-4 w-4" />
                  Me connecter
                </Button>
                <Link to={createPageUrl('Booking')}>
                  <Button className="rounded-full bg-[#E95678] px-5 text-sm text-white shadow-md hover:bg-[#d44565]">
                    Réserver
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="rounded-lg p-2 hover:bg-slate-100 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="space-y-1 border-t border-slate-100 bg-white px-6 py-4 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'bg-[#E95678]/10 text-[#E95678]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-3">
              {currentClient ? (
                <>
                  <Link to={createPageUrl('Booking')} onClick={() => setMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-full">
                      Réserver
                    </Button>
                  </Link>
                  <Link to={createPageUrl('UserDashboard')} onClick={() => setMenuOpen(false)}>
                    <Button className="w-full rounded-full bg-[#E95678] text-white hover:bg-[#d44565]">
                      Mon espace
                    </Button>
                  </Link>
                  {currentClient.role === 'admin' && (
                    <Link to={createPageUrl('Admin')} onClick={() => setMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-full">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" className="w-full rounded-full" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full rounded-full" onClick={handleLogin}>
                    <User className="mr-2 h-4 w-4" /> Me connecter
                  </Button>
                  <Link to={createPageUrl('Booking')} onClick={() => setMenuOpen(false)}>
                    <Button className="w-full rounded-full bg-[#E95678] text-white hover:bg-[#d44565]">
                      Réserver
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-auto bg-[#2d2d2d] pb-6 pt-12 text-slate-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-3">
            <div>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699ece5a2c48b8cfd3773f8a/23f22a7c8_logo_square.png"
                alt="Naky"
                className="mb-4 h-14 w-auto brightness-0 invert"
              />
              <p className="text-sm leading-relaxed text-slate-400">
                Le service de ménage à domicile pensé pour vous : rapide, fiable et humain. Région parisienne.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Navigation</h4>
              <ul className="space-y-2 text-sm">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="transition-colors hover:text-[#E95678]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="tel:0756986001" className="flex items-center gap-2 transition-colors hover:text-[#E95678]">
                    <Phone className="h-4 w-4" />
                    07 56 98 60 01
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@naky.fr" className="flex items-center gap-2 transition-colors hover:text-[#E95678]">
                    <Mail className="h-4 w-4" />
                    contact@naky.fr
                  </a>
                </li>
              </ul>
              <div className="mt-6">
                <Link to={createPageUrl('Booking')}>
                  <Button className="rounded-full bg-[#E95678] px-6 text-sm text-white hover:bg-[#d44565]">
                    Réserver maintenant
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 border-t border-slate-600 pt-6 text-center text-xs text-slate-400 md:flex-row">
            <span>© {new Date().getFullYear()} Naky. Tous droits réservés. - SAS JULI</span>
            <span className="hidden text-slate-600 md:inline">·</span>
            <Link to="/cgv" className="underline underline-offset-2 transition-colors hover:text-[#E95678]">
              Conditions Générales de Vente
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Layout({ children }) {
  return <LayoutContent>{children}</LayoutContent>;
}
