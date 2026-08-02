# Naky v2 — React + Supabase

Refonte de l'app Naky (ménage à domicile) : même produit que la version base44, mais avec
Supabase Auth (fini les mots de passe en clair), Postgres + RLS, Storage privé et Edge Functions.
L'analyse de l'app d'origine est dans `../Naky/ANALYSE.md`, les conventions de portage dans `PORTING.md`.

## Stack
- **Front** : Vite + React 18, React Router, TanStack Query, Tailwind, shadcn/ui
- **Backend** : Supabase — Auth, Postgres (RLS), Storage, Edge Functions (Deno)
- **Paiement** : Stripe (SetupIntent à la réservation, PaymentIntent off-session déclenché par l'admin)
- **Facturation client** : webhooks Make → Abby (inchangé, mais appelés côté serveur)
- **Emails** : Resend

## Mise en route

### 1. Projet Supabase
1. Créer un projet sur [supabase.com](https://supabase.com) (région `eu-west-3` Paris de préférence).
2. **Authentication → Sign In / Up → Email** : désactiver « Confirm email »
   (le funnel crée le compte et la réservation dans la foulée ; réactivable plus tard avec un écran d'attente).
3. **SQL Editor** : exécuter `supabase/migrations/001_init.sql` (tables, RLS, buckets, policies).

### 2. Compte admin
1. **Authentication → Users → Add user** : créer l'utilisateur admin (email + mot de passe).
2. **SQL Editor** :
   ```sql
   update profiles set role = 'admin' where id = '<uuid de l'utilisateur>';
   ```
3. Connexion sur `/AdminLogin`.

### 3. Edge Functions
Avec le [CLI Supabase](https://supabase.com/docs/guides/cli) :
```bash
supabase link --project-ref <ref>
supabase secrets set STRIPE_SECRET_KEY=sk_... \
  RESEND_API_KEY=re_... \
  EMAIL_FROM="Naky <contact@naky.fr>" \
  ADMIN_EMAIL=contact@naky.fr \
  MAKE_URSSAF_WEBHOOK_URL=https://hook.eu1.make.com/... \
  MAKE_BILLING_WEBHOOK_URL=https://hook.eu1.make.com/... \
  ABBY_WEBHOOK_SECRET=<secret partagé avec Abby> \
  DB_WEBHOOK_SECRET=<secret aléatoire>
supabase functions deploy
```
(Les URLs Make sont celles de l'ancienne app : dossier URSSAF `dxqbpx…`, facturation `1gppqn…`.)

### 4. Webhook d'assignation (email « votre agent est assigné »)
**Database → Webhooks → Create** : table `bookings`, événement `UPDATE`,
type HTTP Request → URL de la fonction `notify-assignment`,
header `x-webhook-secret: <DB_WEBHOOK_SECRET>`.

### 5. Front
```bash
cp .env.example .env.local   # remplir URL/anon key Supabase, clé publiable Stripe, clé Google Maps
npm install
npm run dev
```
Clé Google Maps : la restreindre par referrer (console Google Cloud) — elle est publique par nature.

### 6. Resend
Vérifier le domaine `naky.fr` dans Resend pour envoyer depuis `contact@naky.fr`.

## Architecture

```
src/
  lib/constants.js    ← RÈGLES MÉTIER (tarifs 26/29/32, zone 75/92/93/94, créneaux, J+2…)
  lib/format.js       ← durée (minutes) & heure : unique implémentation
  lib/auth.jsx        ← AuthContext Supabase (clients + admins, rôle via profiles)
  api/db.js           ← repos par table (Bookings, Clients, …)
  api/functions.js    ← invokeFunction(name, body) → Edge Functions
  api/storage.js      ← uploadFile / getSignedUrl / BUCKETS
  pages/              ← routes /NomDeLaPage (pages.config.js)
  components/         ← booking/, admin/, partenaire/, ui/ (shadcn)
supabase/
  migrations/001_init.sql   ← schéma + RLS + buckets
  functions/                ← create-setup-intent, charge-client, bill-booking,
                              submit-urssaf, abby-webhook, notify-booking,
                              notify-assignment, enterprise-request
```

## Ce qui change vs l'app base44
- **Auth** : Supabase Auth (JWT, reset par email) — plus de mot de passe en clair ni de `clientId` en localStorage.
- **Durées** : `duration_minutes` (int) — corrige la sous-facturation des « 2h30 ».
- **Statut avance immédiate** : un seul champ `clients.ai_status` au vocabulaire unifié.
- **IBAN/BIC** : table `client_urssaf_details` séparée, jamais exposée aux autres clients (RLS).
- **Webhooks Make** : appelés par les Edge Functions (URLs et payloads côté serveur).
- **Factures** : `invoices.type` distingue client/employée ; PDF dans un bucket privé (URLs signées).
- **Annulation par le client** : toujours manuelle (email) — l'implémentation des règles CGV (24h/50 %/100 %) est une évolution possible.
