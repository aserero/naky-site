import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/components/AuthContext';
import Layout from './Layout.jsx';
import Home from './pages/Home';
import APropos from './pages/APropos';
import Contact from './pages/Contact';
import CreditImpot from './pages/CreditImpot';
import NosServices from './pages/NosServices';
import Booking from './pages/Booking';
import BookingConfirmation from './pages/BookingConfirmation';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import ResetPassword from './pages/ResetPassword';
import UserDashboard from './pages/UserDashboard';
import UrssafForm from './pages/UrssafForm';
import Admin from './pages/Admin';
import AdminBookings from './pages/AdminBookings';
import AdminCalendar from './pages/AdminCalendar';
import AdminClients from './pages/AdminClients';
import AdminEmployees from './pages/AdminEmployees';
import AdminInvoices from './pages/AdminInvoices';
import AdminCandidatures from './pages/AdminCandidatures';
import CGV from './pages/CGV';
import Partenaire from './pages/Partenaire';
import PageNotFound from './lib/PageNotFound';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/a-propos" element={<Layout><APropos /></Layout>} />
      <Route path="/services" element={<Layout><NosServices /></Layout>} />
      <Route path="/credit-impot" element={<Layout><CreditImpot /></Layout>} />
      <Route path="/contact" element={<Layout><Contact /></Layout>} />
      <Route path="/devenir-partenaire" element={<Layout><Partenaire /></Layout>} />
      <Route path="/reservation" element={<Layout><Booking /></Layout>} />
      <Route path="/reservation/confirmee" element={<Layout><BookingConfirmation /></Layout>} />
      <Route path="/connexion" element={<Layout><Connexion /></Layout>} />
      <Route path="/inscription" element={<Layout><Inscription /></Layout>} />
      <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
      <Route path="/compte" element={<Layout><UserDashboard /></Layout>} />
      <Route path="/urssaf" element={<Layout><UrssafForm /></Layout>} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/menages" element={<AdminBookings />} />
      <Route path="/admin/calendrier" element={<AdminCalendar />} />
      <Route path="/admin/clients" element={<AdminClients />} />
      <Route path="/admin/employees" element={<AdminEmployees />} />
      <Route path="/admin/factures" element={<AdminInvoices />} />
      <Route path="/admin/candidatures" element={<AdminCandidatures />} />
      <Route path="/cgv" element={<Layout><CGV /></Layout>} />

      <Route path="/Home" element={<Navigate to="/" replace />} />
      <Route path="/APropos" element={<Navigate to="/a-propos" replace />} />
      <Route path="/NosServices" element={<Navigate to="/services" replace />} />
      <Route path="/CreditImpot" element={<Navigate to="/credit-impot" replace />} />
      <Route path="/Contact" element={<Navigate to="/contact" replace />} />
      <Route path="/Partenaire" element={<Navigate to="/devenir-partenaire" replace />} />
      <Route path="/Booking" element={<Navigate to="/reservation" replace />} />
      <Route path="/BookingConfirmation" element={<Navigate to="/reservation/confirmee" replace />} />
      <Route path="/Connexion" element={<Navigate to="/connexion" replace />} />
      <Route path="/Inscription" element={<Navigate to="/inscription" replace />} />
      <Route path="/ResetPassword" element={<Navigate to="/reset-password" replace />} />
      <Route path="/UserDashboard" element={<Navigate to="/compte" replace />} />
      <Route path="/UrssafForm" element={<Navigate to="/urssaf" replace />} />
      <Route path="/Admin" element={<Navigate to="/admin" replace />} />
      <Route path="/AdminBookings" element={<Navigate to="/admin/menages" replace />} />
      <Route path="/AdminCalendar" element={<Navigate to="/admin/calendrier" replace />} />
      <Route path="/AdminClients" element={<Navigate to="/admin/clients" replace />} />
      <Route path="/AdminEmployees" element={<Navigate to="/admin/employees" replace />} />
      <Route path="/AdminInvoices" element={<Navigate to="/admin/factures" replace />} />
      <Route path="/AdminCandidatures" element={<Navigate to="/admin/candidatures" replace />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
