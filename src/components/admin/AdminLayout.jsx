import React, { useState, useEffect, useCallback } from 'react';
import AdminGuard from './AdminGuard';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  User,
  ClipboardList,
  Calendar as CalendarIcon,
  FileText,
  LogOut,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Bookings, Clients } from '@/api/db';
import { useAuth } from '@/lib/auth';
import { createPageUrl } from '@/utils';

const STORAGE_KEY_BOOKINGS = 'admin_last_seen_bookings';
const STORAGE_KEY_CLIENTS = 'admin_last_seen_clients';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [newBookingsCount, setNewBookingsCount] = useState(0);
  const [newClientsCount, setNewClientsCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    const lastSeenBookings = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    const lastSeenClients = localStorage.getItem(STORAGE_KEY_CLIENTS);

    try {
      const [bookings, clients] = await Promise.all([
        Bookings.list('created_at', false, 200),
        Clients.list('created_at', false, 200),
      ]);

      if (lastSeenBookings) {
        setNewBookingsCount(bookings.filter(b => new Date(b.created_at) > new Date(lastSeenBookings)).length);
      }
      if (lastSeenClients) {
        setNewClientsCount(clients.filter(c => new Date(c.created_at) > new Date(lastSeenClients)).length);
      }
    } catch {
      // pas encore autorisé (garde en cours) — ignorer
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [location.pathname, fetchCounts]);

  // Marquer comme vu quand on visite la page
  useEffect(() => {
    const bookingsPath = createPageUrl('AdminBookings');
    const clientsPath = createPageUrl('AdminClients');
    if (location.pathname === bookingsPath) {
      localStorage.setItem(STORAGE_KEY_BOOKINGS, new Date().toISOString());
      setNewBookingsCount(0);
    }
    if (location.pathname === clientsPath) {
      localStorage.setItem(STORAGE_KEY_CLIENTS, new Date().toISOString());
      setNewClientsCount(0);
    }
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: createPageUrl('Admin'), icon: LayoutDashboard },
    { label: 'Employées', path: createPageUrl('AdminEmployees'), icon: Users },
    { label: 'Clients', path: createPageUrl('AdminClients'), icon: User, badge: newClientsCount },
    { label: 'Ménages', path: createPageUrl('AdminBookings'), icon: ClipboardList, badge: newBookingsCount },
    { label: 'Calendrier', path: createPageUrl('AdminCalendar'), icon: CalendarIcon },
    { label: 'Factures', path: createPageUrl('AdminInvoices'), icon: FileText },
    { label: 'Candidatures', path: createPageUrl('AdminCandidatures'), icon: UserPlus },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* Top Navigation */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto px-3 md:px-6 h-14 md:h-16 flex items-center gap-2">
            {/* Navigation Links — scrollable on mobile, full on desktop */}
            <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 shrink-0 px-2.5 md:px-3 py-1.5 rounded-lg text-[10px] md:text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-green-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Se déconnecter" className="shrink-0">
              <LogOut className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1400px] mx-auto px-3 md:px-6 py-4 md:py-8">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
