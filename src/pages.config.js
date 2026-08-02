// pages.config.js — registre des pages (routes = /NomDeLaPage, voir App.jsx)
import APropos from './pages/APropos';
import Contact from './pages/Contact';
import CreditImpot from './pages/CreditImpot';
import NosServices from './pages/NosServices';
import CGV from './pages/CGV';
import Partenaire from './pages/Partenaire';
import Admin from './pages/Admin';
import AdminBookings from './pages/AdminBookings';
import AdminCalendar from './pages/AdminCalendar';
import AdminCandidatures from './pages/AdminCandidatures';
import AdminClients from './pages/AdminClients';
import AdminEmployees from './pages/AdminEmployees';
import AdminInvoices from './pages/AdminInvoices';
import AdminLogin from './pages/AdminLogin';
import Booking from './pages/Booking';
import BookingConfirmation from './pages/BookingConfirmation';
import Connexion from './pages/Connexion';
import Home from './pages/Home';
import Inscription from './pages/Inscription';
import NouveauMotDePasse from './pages/NouveauMotDePasse';
import UrssafForm from './pages/UrssafForm';
import UserDashboard from './pages/UserDashboard';
import __Layout from './Layout.jsx';

export const PAGES = {
    "APropos": APropos,
    "Contact": Contact,
    "CreditImpot": CreditImpot,
    "NosServices": NosServices,
    "CGV": CGV,
    "Partenaire": Partenaire,
    "Admin": Admin,
    "AdminBookings": AdminBookings,
    "AdminCalendar": AdminCalendar,
    "AdminCandidatures": AdminCandidatures,
    "AdminClients": AdminClients,
    "AdminEmployees": AdminEmployees,
    "AdminInvoices": AdminInvoices,
    "AdminLogin": AdminLogin,
    "Booking": Booking,
    "BookingConfirmation": BookingConfirmation,
    "Connexion": Connexion,
    "Home": Home,
    "Inscription": Inscription,
    "NouveauMotDePasse": NouveauMotDePasse,
    "UrssafForm": UrssafForm,
    "UserDashboard": UserDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
