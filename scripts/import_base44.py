# -*- coding: utf-8 -*-
"""
Import des exports CSV base44 vers Supabase (Naky v2).

- Ne migre JAMAIS les mots de passe (colonne password ignorée).
- Mappe l'ancien modèle vers le nouveau (durées -> minutes, urssaf_status -> ai_status,
  détails URSSAF -> client_urssaf_details, documents employées -> table dédiée).
- Télécharge les fichiers base44 (CV, documents, factures) et les re-upload
  dans les buckets Supabase.
- Idempotent via legacy_id : relancer le script ignore les lignes déjà importées.

Usage :
  set SUPABASE_URL=... SUPABASE_SERVICE_KEY=... EXPORT_DIR=C:\\Users\\talia\\Downloads
  python scripts/import_base44.py
"""
import csv
import json
import os
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone

SUPABASE_URL = os.environ['SUPABASE_URL'].rstrip('/')
SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']
EXPORT_DIR = os.environ.get('EXPORT_DIR', r'C:\Users\talia\Downloads')

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) naky-import/1.0'
DEFAULT_RATES = {'regular': 26, 'one_time': 29, 'spring': 32, 'enterprise': 0}

report = {'files_ok': 0, 'files_ko': []}


def http(method, url, body=None, headers=None, raw=False):
    h = {'User-Agent': UA}
    if headers:
        h.update(headers)
    data = body
    if body is not None and not raw:
        data = json.dumps(body).encode()
        h['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=60) as r:
        payload = r.read()
        if r.headers.get('Content-Type', '').startswith('application/json') and payload:
            return json.loads(payload)
        return payload


def rest(method, table, body=None, params=''):
    url = f'{SUPABASE_URL}/rest/v1/{table}{params}'
    return http(method, url, body, {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Prefer': 'return=representation',
    })


def upload_storage(bucket, path, content, content_type):
    url = f'{SUPABASE_URL}/storage/v1/object/{bucket}/{path}'
    http('POST', url, content, {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': content_type,
        'x-upsert': 'true',
    }, raw=True)
    return path


def download(url):
    return http('GET', url)


def safe_name(name):
    return re.sub(r'[^a-zA-Z0-9._-]', '_', name)[:120]


def guess_ct(name):
    ext = name.lower().rsplit('.', 1)[-1] if '.' in name else ''
    return {
        'pdf': 'application/pdf', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
        'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }.get(ext, 'application/octet-stream')


def migrate_file(url, bucket, dest_path):
    """Télécharge un fichier base44 et l'upload dans un bucket. Retourne le path ou None."""
    if not url:
        return None
    try:
        content = download(url)
        upload_storage(bucket, dest_path, content, guess_ct(dest_path))
        report['files_ok'] += 1
        return dest_path
    except Exception as e:  # noqa: BLE001 - on veut continuer l'import
        report['files_ko'].append(f'{url} -> {bucket}/{dest_path}: {e}')
        return None


def read_csv(name):
    p = os.path.join(EXPORT_DIR, f'{name}_export.csv')
    with open(p, encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh))


def nz(v):
    """'' -> None, sinon strip."""
    v = (v or '').strip()
    return v or None


def to_bool(v):
    return (v or '').strip().lower() == 'true'


def paris_date(v):
    """'2026-03-30T22:00:00.000Z' -> '2026-03-31' (Europe/Paris) ; 'yyyy-MM-dd' inchangé."""
    v = (v or '').strip()
    if not v:
        return None
    if 'T' not in v:
        return v
    dt = datetime.fromisoformat(v.replace('Z', '+00:00'))
    # Heure d'été Paris (mars-octobre, période des données) = UTC+2, sinon UTC+1
    offset = 2 if 3 <= dt.astimezone(timezone.utc).month <= 10 else 1
    return (dt + timedelta(hours=offset)).date().isoformat()


def to_ts(v):
    v = nz(v)
    return v if v else None


def parse_duration_minutes(duration, hours):
    """'3h','4h30','2,5h','4','5H30','3h00' -> minutes. Fallback sur hours (décimal)."""
    d = (duration or '').strip().lower().replace(',', '.')
    m = re.match(r'^(\d+(?:\.\d+)?)\s*h\s*(\d{1,2})?$', d)
    if m:
        mins = float(m.group(1)) * 60 + (int(m.group(2)) if m.group(2) else 0)
        return int(round(mins))
    if re.match(r'^\d+(\.\d+)?$', d):
        return int(round(float(d) * 60))
    h = nz(hours)
    if h:
        try:
            return int(round(float(h.replace(',', '.')) * 60))
        except ValueError:
            pass
    return None


def parse_time(v):
    """'08:00','9h','14h30','12h' -> 'HH:MM'. Défaut 09:00."""
    v = (v or '').strip().lower().replace('h', ':').rstrip(':')
    m = re.match(r'^(\d{1,2})(?::(\d{1,2}))?$', v)
    if not m:
        return '09:00'
    hh = int(m.group(1))
    mm = int(m.group(2) or 0)
    if not (0 <= hh <= 23):
        return '09:00'
    return f'{hh:02d}:{mm:02d}'


def existing_legacy(table):
    rows = rest('GET', table, params='?select=id,legacy_id&legacy_id=not.is.null&limit=10000')
    return {r['legacy_id']: r['id'] for r in rows}


def num(v, default=None):
    v = nz(v)
    if v is None:
        return default
    try:
        return float(v.replace(',', '.'))
    except ValueError:
        return default


def main():
    counts = {}

    # ---------- EMPLOYEES ----------
    emp_map = existing_legacy('employees')
    created = 0
    for r in read_csv('Employee'):
        if r['id'] in emp_map:
            continue
        row = {
            'legacy_id': r['id'],
            'first_name': nz(r['first_name']) or '?',
            'last_name': nz(r['last_name']) or '?',
            'email': nz(r['email']),
            'phone': nz(r['phone']),
            'address': nz(r['address']),
            'status': nz(r['status']) or 'active',
            'joined_date': nz(r['joined_date']),
            'hourly_rate': num(r['hourly_rate']),
            'color': nz(r['color']),
            'photo_url': nz(r['photo_url']),
            'created_at': to_ts(r['created_date']),
        }
        emp = rest('POST', 'employees', row)[0]
        emp_map[r['id']] = emp['id']
        created += 1
        # documents embarqués -> table + bucket
        for doc in json.loads(r['documents'] or '[]'):
            if not doc.get('url'):
                continue
            dest = f"{emp['id']}/{safe_name(doc.get('name') or 'document')}"
            path = migrate_file(doc['url'], 'employee-docs', dest)
            if path:
                rest('POST', 'employee_documents', {
                    'employee_id': emp['id'],
                    'name': doc.get('name') or 'document',
                    'type': doc.get('type') or 'autre',
                    'storage_path': path,
                    'uploaded_at': doc.get('uploaded_at'),
                })
    counts['employees'] = created

    # ---------- CLIENTS (+ détails URSSAF) ----------
    cli_map = existing_legacy('clients')
    seen_emails = {}
    created = 0
    for r in read_csv('Client'):
        if r['id'] in cli_map:
            continue
        email = (nz(r['email']) or f"inconnu-{r['id']}@import.naky.fr").lower()
        if email in seen_emails:
            email = f"{r['id']}+{email}"  # doublon d'email : suffixe pour l'unicité
        seen_emails[email] = True
        status_map = {'ai_accepted', 'ai_requested', 'ai_refused', 'pending', 'completed', 'none'}
        ai = nz(r['urssaf_status']) or 'none'
        if ai not in status_map:
            ai = 'none'
        completed = to_bool(r['urssaf_completed'])
        if completed and ai == 'none':
            ai = 'completed'
        row = {
            'legacy_id': r['id'],
            'civilite': nz(r['civilite']) if nz(r['civilite']) in ('M', 'Mme') else None,
            'first_name': (nz(r['first_name']) or '?').strip(),
            'last_name': (nz(r['last_name']) or '?').strip(),
            'email': email,
            'phone': nz(r['phone']),
            'address': nz(r['address']),
            'zipcode': nz(r['zipcode']),
            'city': nz(r['city']),
            'digicode': nz(r['digicode']),
            'instructions': nz(r['instructions']),
            'has_animals': to_bool(r['has_animals']),
            'status': nz(r['status']) or 'active',
            'urssaf_completed': completed,
            'ai_status': ai,
            'abby_id': nz(r['idAbby']),
            'stripe_customer_id': nz(r['stripe_customer_id']),
            'stripe_payment_method_id': nz(r['stripe_payment_method_id']),
            'created_at': to_ts(r['created_date']),
            # password : IGNORÉ volontairement
        }
        cli = rest('POST', 'clients', row)[0]
        cli_map[r['id']] = cli['id']
        created += 1

        detail_fields = ['nom_naissance', 'birthdate', 'pays_naissance', 'zipcode_naissance',
                         'iban', 'bic', 'account_holder', 'numero_voie', 'lettre_voie',
                         'type_voie', 'nom_voie', 'lieu_dit', 'complement_adresse', 'pays']
        if any(nz(r.get(f)) for f in detail_fields):
            details = {f: nz(r.get(f)) for f in detail_fields}
            details.update({
                'client_id': cli['id'],
                'zipcode': nz(r['zipcode']),
                'city': nz(r['city']),
            })
            rest('POST', 'client_urssaf_details', details)
    counts['clients'] = created

    # ---------- BOOKINGS ----------
    bk_map = existing_legacy('bookings')
    created = 0
    for r in read_csv('Booking'):
        if r['id'] in bk_map:
            continue
        minutes = parse_duration_minutes(r['duration'], r['hours'])
        if minutes is None:
            minutes = 120
        service = nz(r['service_type']) or 'regular'
        rate = num(r['hourly_rate'])
        total = num(r['total_price'])
        if rate is None:
            rate = round(total / (minutes / 60), 2) if total else DEFAULT_RATES.get(service, 26)
        if total is None:
            total = round(rate * minutes / 60, 2)
        instructions = nz(r['instructions'])
        if not nz(r['client_id']):
            cd = json.loads(r['contact_details'] or '{}')
            contact = ' '.join(filter(None, [cd.get('first_name'), cd.get('last_name'), cd.get('phone'), cd.get('email')])).strip()
            if contact:
                note = f'[Import] Contact : {contact}'
                instructions = f'{note}\n{instructions}' if instructions else note
        recurrence = nz(r['recurrence']) or 'none'
        if recurrence not in ('none', 'weekly', 'twice_weekly', 'biweekly', 'monthly'):
            recurrence = 'none'
        urssaf = nz(r['urssaf_status']) or 'none'
        if urssaf not in ('none', 'pending', 'requested', 'accepted', 'refused'):
            urssaf = 'none'
        row = {
            'legacy_id': r['id'],
            'client_id': cli_map.get(nz(r['client_id'])),
            'employee_id': emp_map.get(nz(r['employee_id'])),
            'address': nz(r['address']) or '?',
            'zipcode': nz(r['zipcode']) or '?',
            'city': nz(r['city']) or '?',
            'additional_address': nz(r['additional_address']),
            'service_type': service,
            'recurrence': recurrence,
            'date': paris_date(r['date']),
            'start_time': parse_time(r['time']),
            'duration_minutes': minutes,
            'hourly_rate': rate,
            'total_price': total,
            'advance_immediate': to_bool(r['advance_immediate']),
            'has_animals': to_bool(r['has_animals']),
            'has_cleaning_supplies': to_bool(r['has_cleaning_supplies']),
            'instructions': instructions,
            'status': nz(r['status']) or 'pending',
            'billing_status': nz(r['billing_status']) or 'none',
            'payment_method': nz(r['payment_method']) if nz(r['payment_method']) in ('stripe', 'urssaf') else None,
            'urssaf_status': urssaf,
            'abby_invoice_id': nz(r['invoice_id']),
            'created_at': to_ts(r['created_date']),
        }
        bk = rest('POST', 'bookings', row)[0]
        bk_map[r['id']] = bk['id']
        created += 1
    counts['bookings'] = created

    # ---------- INVOICES (factures employées, PDF -> bucket) ----------
    inv_map = existing_legacy('invoices')
    created = 0
    for r in read_csv('Invoice'):
        if r['id'] in inv_map:
            continue
        emp_id = emp_map.get(nz(r['employee_id']))
        file_path = None
        if nz(r['file_url']):
            dest = f"employees/{emp_id or 'inconnu'}/{safe_name(r['number'])}.pdf"
            file_path = migrate_file(r['file_url'], 'invoices', dest)
        row = {
            'legacy_id': r['id'],
            'type': 'employee',
            'number': nz(r['number']) or f"IMPORT-{r['id'][:8]}",
            'employee_id': emp_id,
            'amount': num(r['amount'], 0),
            'date': paris_date(r['date']),
            'period_start': paris_date(r['period_start']),
            'period_end': paris_date(r['period_end']),
            'status': nz(r['status']) or 'pending',
            'file_path': file_path,
            'created_at': to_ts(r['created_date']),
        }
        inv = rest('POST', 'invoices', row)[0]
        inv_map[r['id']] = inv['id']
        created += 1
    counts['invoices'] = created

    # ---------- CANDIDATURES (CV -> bucket) ----------
    cand_map = existing_legacy('candidatures')
    created = 0
    for r in read_csv('Candidature'):
        if r['id'] in cand_map:
            continue
        cv_path = None
        if nz(r['cv_url']):
            name = r['cv_url'].rsplit('/', 1)[-1] or 'cv.pdf'
            cv_path = migrate_file(r['cv_url'], 'cvs', f"{r['id']}/{safe_name(name)}")
        try:
            lieux = json.loads(r['lieux_experience'] or '[]')
        except ValueError:
            lieux = []
        def enum_or_none(v, allowed):
            v = nz(v)
            return v if v in allowed else None
        row = {
            'legacy_id': r['id'],
            'civilite': enum_or_none(r['civilite'], ('M', 'Mme')),
            'first_name': nz(r['first_name']),
            'last_name': nz(r['last_name']),
            'email': nz(r['email']) or f"inconnu-{r['id']}@import.naky.fr",
            'phone': nz(r['phone']),
            'address': nz(r['address']),
            'zipcode': nz(r['zipcode']),
            'city': nz(r['city']),
            'permis_sejour': enum_or_none(r['permis_sejour'], ('francaise', 'europeenne', 'titre_residence', 'visa', 'aucun')),
            'heures_semaine': enum_or_none(r['heures_semaine'], ('5-15', '15-30', '31-35')),
            'annees_experience': enum_or_none(r['annees_experience'], ('aucune', 'moins_2ans', 'plus_2ans', 'plus_5ans')),
            'lieux_experience': lieux,
            'vehicule': enum_or_none(r['vehicule'], ('voiture', 'scooter', 'velo', 'non')),
            'cv_path': cv_path,
            'status': nz(r['status']) or 'pending',
            'created_at': to_ts(r['created_date']),
        }
        rest('POST', 'candidatures', row)
        cand_map[r['id']] = True
        created += 1
    counts['candidatures'] = created

    # ---------- Lier anthony@talia.fr à son compte auth ----------
    users = http('GET', f'{SUPABASE_URL}/auth/v1/admin/users?per_page=100', headers={
        'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}'})
    for u in users.get('users', []):
        try:
            rest('PATCH', 'clients', {'user_id': u['id']}, params=f"?email=eq.{u['email']}&user_id=is.null")
        except urllib.error.HTTPError:
            pass

    print(json.dumps({'importes': counts, 'fichiers_migres': report['files_ok'],
                      'fichiers_en_echec': report['files_ko']}, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
