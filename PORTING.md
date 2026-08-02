# Naky v2 — Spec de portage base44 → Supabase

Référence pour porter les pages/composants copiés de `../Naky` (base44) vers la nouvelle stack.
Le socle est déjà en place — **ne pas le modifier** : `src/lib/supabase.js`, `src/lib/constants.js`,
`src/lib/format.js`, `src/lib/auth.jsx`, `src/api/db.js`, `src/api/functions.js`, `src/api/storage.js`,
`src/App.jsx`, `supabase/` (SQL + Edge Functions).

## 1. Remplacements systématiques

| Ancien (base44) | Nouveau |
|---|---|
| `import { base44 } from '@/api/base44Client'` | `import { Bookings, Clients, Employees, Candidatures, Invoices, Leads, UrssafDetails, PublicEmployees, EmployeeDocuments } from '@/api/db'` |
| `base44.entities.Booking.list()` | `Bookings.list()` (tri par `created_at` desc par défaut) |
| `base44.entities.X.filter({...})` | `X.filter({...})` |
| `base44.entities.X.create({...})` | `X.create({...})` |
| `base44.entities.X.update(id, {...})` | `X.update(id, {...})` |
| `base44.entities.X.delete(id)` | `X.remove(id)` |
| `base44.functions.invoke('name', body)` → `res.data` | `invokeFunction('name', body)` → retourne le JSON directement (`import { invokeFunction } from '@/api/functions'`) |
| `base44.integrations.Core.UploadFile({ file })` → `{ file_url }` | `uploadFile(BUCKETS.xxx, file, dossier)` → `{ path, publicUrl }` (`import { uploadFile, getSignedUrl, BUCKETS } from '@/api/storage'`) |
| `base44.integrations.Core.SendEmail(...)` | supprimé — les emails partent des Edge Functions |
| `useAuth` de `@/components/AuthContext` | inchangé (shim) — mais nouvelle API, voir §3 |

## 2. Mapping des champs (ancien → nouveau)

### bookings
| Ancien | Nouveau | Note |
|---|---|---|
| `time` ("14h") | `start_time` ("14:00") | type SQL `time`, relu comme "14:00:00" → normaliser avec `timeToHHMM()`, afficher avec `formatTime()` |
| `duration` ("2h30") | `duration_minutes` (150) | afficher avec `formatDuration()` ; heures décimales : `durationToHours()` |
| `hours` | supprimé | = `duration_minutes / 60` |
| `hourly_rate` | `hourly_rate` | **toujours renseigné** à la création (funnel : `HOURLY_RATES[service_type]`) |
| `contact_details` (objet) | supprimé | les coordonnées vivent sur `clients` ; **ne jamais stocker de mot de passe** |
| `invoice_id` | `abby_invoice_id` | |
| `invoice_file_url` | `invoice_file_path` | chemin dans le bucket privé `invoices` → afficher via `getSignedUrl(BUCKETS.invoices, path)` |
| `created_date` | `created_at` | partout (toutes les tables) |
| `payment_method` | `payment_method` | désormais réellement renseigné (par charge-client / bill-booking) |

### clients
| Ancien | Nouveau |
|---|---|
| `password` | **supprimé** — Supabase Auth |
| `urssaf_status` (2 vocabulaires mélangés) | `ai_status` : `none → pending → completed → ai_requested → ai_accepted/ai_refused` |
| `idAbby` | `abby_id` |
| champs URSSAF (iban, bic, account_holder, nom_naissance, birthdate, pays_naissance, zipcode_naissance, numero_voie, lettre_voie, type_voie, nom_voie, lieu_dit, complement_adresse, pays) | table séparée `client_urssaf_details` (repo `UrssafDetails`, clé = `client_id`) |

### invoices
Nouveau champ obligatoire `type: 'employee' | 'client'`. `file_url` → `file_path` (bucket `invoices`, URL via `getSignedUrl`).

### candidatures
`cv_url` → `cv_path` (bucket `cvs`, privé — l'admin lit via `getSignedUrl(BUCKETS.cvs, cv_path)`).

### employees
`documents[]` (tableau embarqué) → table `employee_documents` (repo `EmployeeDocuments`) : `{ employee_id, name, type, storage_path }`, fichiers dans le bucket `employee-docs` (privé, URL via `getSignedUrl`). Champ `label` : utiliser le libellé dérivé du `type`.
Côté client (UserDashboard), lire les employées via `PublicEmployees.list()` (vue `id, first_name, photo_url`).

## 3. Auth (`useAuth`)

```js
const { user, session, role, isAdmin, currentClient, loading,
        login, signup, logout, updateClient, resetPassword } = useAuth();
```
- `login(email, password)` → jette « Email ou mot de passe incorrect » en cas d'échec.
- `signup(password, clientData)` — **le mot de passe est un argument séparé**, jamais dans clientData.
  `clientData = { civilite, first_name, last_name, email, phone, address, zipcode, city, has_animals? }`.
  Jette « Un compte existe déjà avec cet email » si l'email est pris (plus besoin de pré-vérifier par filter()).
- `logout()` est async.
- `resetPassword(email)` → email Supabase natif, atterrit sur `/NouveauMotDePasse` (plus de fonction forgotPassword).
- Session persistée par Supabase (plus de `localStorage.clientId`).

## 4. Constantes & formatage — OBLIGATOIRE

Ne jamais recoder tarifs/zone/durées : tout vient de `@/lib/constants` :
`HOURLY_RATES`, `SERVICE_LABELS`, `RECURRENCE_LABELS`, `BOOKING_STATUS_LABELS`, `BILLING_STATUS_LABELS`,
`AI_STATUS_LABELS`, `ALLOWED_ZIP_PREFIXES`, `ZONE_LABEL`, `isZipAllowed(zip)`, `CLIENT_DURATIONS_MIN`,
`ADMIN_DURATIONS_MIN`, `CLIENT_TIME_SLOTS`, `ADMIN_TIME_SLOTS`, `MIN_BOOKING_LEAD_DAYS`,
`TAX_CREDIT_RATE`, `CONTACT`, `COMPANY`, `GOOGLE_MAPS_API_KEY`, `computePrice(serviceType, durationMinutes)`.

Affichage : `formatDuration`, `durationToHours`, `formatTime`, `timeToHHMM`, `formatPrice` de `@/lib/format`.
**Interdiction absolue** de `duration.replace('h', ...)`, `parseFloat(duration)`, regex de durée : tout est en minutes.

Clé Google Maps : `GOOGLE_MAPS_API_KEY` (env) — jamais en dur.

## 5. Edge Functions disponibles (`invokeFunction(name, body)`)

| Nom | Body | Retour | Qui |
|---|---|---|---|
| `create-setup-intent` | `{ clientEmail, clientName }` | `{ clientSecret, customerId }` | funnel (anonyme OK) |
| `charge-client` | `{ bookingId }` | `{ success, paymentIntentId }` | admin — passe le booking en completed + payment_method stripe |
| `bill-booking` | `{ bookingId, paymentType: 'stripe'\|'urssaf' }` | `{ success, invoiceId, invoiceFilePath }` | admin — webhook Make + facture + Invoice + maj booking (remplace TOUT le code webhook navigateur) |
| `submit-urssaf` | `{ clientId, formData }` | `{ success, idAbby }` | client (son dossier) ou admin — upsert détails + Make + email |
| `notify-booking` | `{ bookingId }` | `{ success }` | après création de réservation |
| `enterprise-request` | `{ first_name, last_name, email, phone }` | `{ success }` | public — crée aussi un lead `enterprise` |

`notify-assignment` et `abby-webhook` ne s'appellent pas depuis le front (webhooks).
La clé publiable Stripe vient de `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY` (plus de fonction getStripePublishableKey).

## 6. Correctifs à appliquer pendant le portage (ne pas reproduire les bugs)

1. Prix : uniquement `computePrice()` — corrige la sous-facturation des demi-heures.
2. Le récap panier affiche le tarif du service sélectionné (pas « 26€/h » en dur).
3. `payment_method` : ne pas le poser à la création (les fonctions serveur s'en chargent).
4. Statuts AI : uniquement `clients.ai_status` avec le vocabulaire unifié (§2).
5. Zone : `isZipAllowed()` + message d'erreur `ZONE_LABEL` réellement affiché ; contrôle de zone AUSSI dans QuickBookingDialog.
6. Dates : toujours `format(date, 'yyyy-MM-dd')` (date-fns) ; heures : toujours `"HH:MM"`.
7. Mot de passe : min. 6 caractères partout (funnel inclus) ; jamais stocké hors Supabase Auth.
8. Suppressions (client, employée, réservation) : toujours une confirmation (AlertDialog).
9. QuickBookingDialog : `has_cleaning_supplies` = vraie case à cocher (pas forcé à true) ; remise 50 % affichée seulement si avance immédiate/URSSAF ok ; redirection `createPageUrl('UrssafForm')`.
10. Supprimer le code mort : `handleFinalSubmit`/`?resume=true`, `StatCard.jsx`, `InterventionCard.jsx`, l'édition inline gated sur `step === 9` dans CartSummary.
11. Réservations récurrentes : utiliser `Bookings.createMany(rows)` (un seul insert).
12. `has_cleaning_supplies` reste une confirmation obligatoire dans le funnel principal (règle produit inchangée).

## 7. Style & conventions

- Tout l'UI existant (shadcn `src/components/ui/*`, Tailwind, couleur #E95678) est conservé tel quel.
- Toasts : `sonner` uniquement (remplacer les usages de react-hot-toast par `import { toast } from 'sonner'`).
- React Query : garder les mêmes clés de cache (`['bookings']`, `['clients']`, …).
- Textes en français, mêmes wording qu'avant sauf corrections listées.
