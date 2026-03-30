import React, { useState, useEffect } from 'react';
import AdminGuard from './AdminGuard';
import { Link, useLocation } from 'react-router-dom';
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
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/AuthContext';

const STORAGE_KEY_BOOKINGS = 'admin_last_seen_bookings';
const STORAGE_KEY_CLIENTS = 'admin_last_seen_clients';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const { logout, currentClient } = useAuth();
  const [newBookingsCount, setNewBookingsCount] = useState(0);
  const [newClientsCount, setNewClientsCount] = useState(0);

  const fetchCounts = async () => {
    const lastSeenBookings = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    const lastSeenClients = localStorage.getItem(STORAGE_KEY_CLIENTS);

    const [bookings, clients] = await Promise.all([
      base44.entities.Booking.list('-created_date', 200),
      base44.entities.Client.list('-created_date', 200),
    ]);

    if (lastSeenBookings) {
      setNewBookingsCount(bookings.filter(b => new Date(b.created_date) > new Date(lastSeenBookings)).length);
    }
    if (lastSeenClients) {
      setNewClientsCount(clients.filter(c => new Date(c.created_date) > new Date(lastSeenClients)).length);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [location.pathname]);

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

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* Top Navigation */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
            {/* Navigation Links */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    asChild
                    variant="ghost"
                    className={`relative gap-2 h-9 px-4 text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-green-600 text-white hover:bg-green-700 hover:text-white' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Link to={item.path}>
                      <Icon className="w-4 h-4" />
                      {item.label}
                      {item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </Button>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-900">{currentClient?.first_name || 'Admin'} {currentClient?.last_name || ''}</p>
                <p className="text-xs text-[#E95678] font-medium">Administrateur</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Se déconnecter">
                <LogOut className="w-4 h-4 text-slate-400" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1400px] mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
