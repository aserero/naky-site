/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import APropos from './pages/APropos';
import Contact from './pages/Contact';
import CreditImpot from './pages/CreditImpot';
import NosServices from './pages/NosServices';
import Admin from './pages/Admin';
import AdminBookings from './pages/AdminBookings';
import AdminCalendar from './pages/AdminCalendar';
import AdminClients from './pages/AdminClients';
import AdminEmployees from './pages/AdminEmployees';
import AdminInvoices from './pages/AdminInvoices';
import Booking from './pages/Booking';
import BookingConfirmation from './pages/BookingConfirmation';
import Connexion from './pages/Connexion';
import Home from './pages/Home';
import Inscription from './pages/Inscription';
import UrssafForm from './pages/UrssafForm';
import UserDashboard from './pages/UserDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "APropos": APropos,
    "Contact": Contact,
    "CreditImpot": CreditImpot,
    "NosServices": NosServices,
    "Admin": Admin,
    "AdminBookings": AdminBookings,
    "AdminCalendar": AdminCalendar,
    "AdminClients": AdminClients,
    "AdminEmployees": AdminEmployees,
    "AdminInvoices": AdminInvoices,
    "Booking": Booking,
    "BookingConfirmation": BookingConfirmation,
    "Connexion": Connexion,
    "Home": Home,
    "Inscription": Inscription,
    "UrssafForm": UrssafForm,
    "UserDashboard": UserDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};