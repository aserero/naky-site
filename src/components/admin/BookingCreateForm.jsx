import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bookings } from '@/api/db';
import {
  SERVICE_LABELS,
  HOURLY_RATES,
  ADMIN_DURATIONS_MIN,
  ADMIN_TIME_SLOTS,
} from '@/lib/constants';
import { formatDuration } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';
import { addWeeks, format } from 'date-fns';

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Prochaine occurrence d'un jour de semaine (0=Lundi ... 6=Dimanche) à partir d'une date
function nextWeekday(startDate, targetDay) {
  const d = new Date(startDate);
  // JS getDay(): 0=Dim, 1=Lun... — notre index : 0=Lun ... 6=Dim
  const jsDay = (targetDay + 1) % 7;
  let diff = jsDay - d.getDay();
  if (diff < 0) diff += 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

export default function BookingCreateForm({ employees, clients, onClose }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientList, setShowClientList] = useState(false);

  const [form, setForm] = useState({
    client_id: '',
    address: '',
    zipcode: '',
    city: '',
    additional_address: '',
    service_type: 'regular',
    duration_minutes: 180,
    date: '',
    start_time: '09:00',
    employee_id: '',
    has_animals: false,
    has_cleaning_supplies: false,
    instructions: '',
    hourly_rate: String(HOURLY_RATES.regular),
    total_price: (HOURLY_RATES.regular * 3).toFixed(2),
    status: 'confirmed',
  });

  // Recurrence state
  const [useRecurrence, setUseRecurrence] = useState(false);
  const [weeklySlots, setWeeklySlots] = useState([{ day: 0, time: '09:00' }]);
  const [weeksCount, setWeeksCount] = useState(4);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const computeTotal = (rate, minutes) => {
    const r = parseFloat(rate);
    if (isNaN(r) || !minutes) return '';
    return (Math.round(r * (minutes / 60) * 100) / 100).toFixed(2);
  };

  const setRate = (rate) => {
    setForm(f => ({ ...f, hourly_rate: rate, total_price: computeTotal(rate, f.duration_minutes) }));
  };

  const setDurationMinutes = (minutes) => {
    setForm(f => ({ ...f, duration_minutes: minutes, total_price: computeTotal(f.hourly_rate, minutes) }));
  };

  const setServiceType = (serviceType) => {
    // Le tarif par défaut suit le type de prestation (modifiable ensuite)
    const rate = HOURLY_RATES[serviceType] != null ? String(HOURLY_RATES[serviceType]) : '';
    setForm(f => ({
      ...f,
      service_type: serviceType,
      hourly_rate: rate,
      total_price: computeTotal(rate, f.duration_minutes),
    }));
  };

  const selectedClient = useMemo(
    () => clients.find(c => c.id === form.client_id) || null,
    [clients, form.client_id]
  );

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 10);
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    ).slice(0, 10);
  }, [clients, clientSearch]);

  const handleClientSelect = (client) => {
    setForm(f => ({
      ...f,
      client_id: client.id,
      // Les coordonnées d'intervention se pré-remplissent depuis la fiche client (modifiables)
      address: client.address || '',
      zipcode: client.zipcode || '',
      city: client.city || '',
      has_animals: !!client.has_animals,
    }));
    setClientSearch(`${client.first_name} ${client.last_name}`);
    setShowClientList(false);
  };

  const clearClient = () => {
    setForm(f => ({ ...f, client_id: '' }));
    setClientSearch('');
  };

  const addWeeklySlot = () => setWeeklySlots(s => [...s, { day: 0, time: '09:00' }]);
  const removeWeeklySlot = (i) => setWeeklySlots(s => s.filter((_, idx) => idx !== i));
  const updateWeeklySlot = (i, key, val) => setWeeklySlots(s => s.map((slot, idx) => idx === i ? { ...slot, [key]: val } : slot));

  // Dates générées (récurrence hebdomadaire) — aussi utilisées pour le compteur
  const computeBookingDates = () => {
    if (!form.date) return [];
    if (!useRecurrence) return [{ date: form.date, start_time: form.start_time }];
    const startDate = new Date(form.date + 'T00:00:00');
    const results = [];
    for (const slot of weeklySlots) {
      const first = nextWeekday(startDate, slot.day);
      for (let w = 0; w < weeksCount; w++) {
        results.push({ date: format(addWeeks(first, w), 'yyyy-MM-dd'), start_time: slot.time });
      }
    }
    return results.sort((a, b) => a.date.localeCompare(b.date));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_id) {
      toast.error('Veuillez lier un client existant (créez d\'abord sa fiche dans l\'onglet Clients).');
      return;
    }
    if (!form.date) {
      toast.error('Veuillez choisir une date.');
      return;
    }
    setLoading(true);
    try {
      const baseBooking = {
        client_id: form.client_id,
        address: form.address,
        zipcode: form.zipcode,
        city: form.city,
        additional_address: form.additional_address || null,
        service_type: form.service_type,
        duration_minutes: form.duration_minutes,
        recurrence: useRecurrence ? 'weekly' : 'none',
        has_animals: form.has_animals,
        has_cleaning_supplies: form.has_cleaning_supplies,
        instructions: form.instructions || null,
        hourly_rate: parseFloat(form.hourly_rate),
        total_price: parseFloat(form.total_price),
        status: form.status,
        employee_id: form.employee_id || null,
      };

      const rows = computeBookingDates().map(({ date, start_time }) => ({ ...baseBooking, date, start_time }));
      if (rows.length === 1) {
        await Bookings.create(rows[0]);
      } else {
        await Bookings.createMany(rows);
      }

      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(rows.length > 1 ? `${rows.length} ménages créés` : 'Ménage créé');
      onClose();
    } catch (err) {
      toast.error('Erreur lors de la création : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const bookingCount = form.date ? computeBookingDates().length : useRecurrence ? weeklySlots.length * weeksCount : 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

      {/* Client search — liaison obligatoire */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-slate-700">Client *</Label>
        <div className="relative">
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher par nom, email, téléphone..."
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setShowClientList(true); if (!e.target.value) clearClient(); }}
              onFocus={() => setShowClientList(true)}
              onBlur={() => setTimeout(() => setShowClientList(false), 150)}
              className="flex-1"
            />
            {form.client_id && (
              <Button type="button" variant="ghost" size="icon" onClick={clearClient} className="h-9 w-9 text-slate-400">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {showClientList && !form.client_id && filteredClients.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredClients.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0"
                  onClick={() => handleClientSelect(c)}
                >
                  <span className="font-medium">{c.first_name} {c.last_name}</span>
                  {c.phone && <span className="text-slate-400 ml-2 text-xs">{c.phone}</span>}
                  {c.email && <span className="text-slate-400 ml-2 text-xs">{c.email}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {!form.client_id && (
          <p className="text-xs text-slate-400">
            Le ménage doit être rattaché à une fiche client. Si le client n'existe pas encore, créez-le d'abord depuis l'onglet Clients.
          </p>
        )}
      </div>

      {/* Coordonnées du client lié (lecture seule) */}
      {selectedClient && (
        <div className="border rounded-lg p-4 space-y-1 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Coordonnées du client</p>
          <p className="text-sm font-medium text-slate-800">
            {selectedClient.civilite ? `${selectedClient.civilite} ` : ''}{selectedClient.first_name} {selectedClient.last_name}
          </p>
          <p className="text-xs text-slate-500">
            {[selectedClient.phone, selectedClient.email].filter(Boolean).join(' · ') || 'Aucune coordonnée renseignée'}
          </p>
          <Badge className="mt-1 bg-blue-100 text-blue-700 border-none text-xs">Client lié</Badge>
        </div>
      )}

      {/* Address */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Adresse de l'intervention</p>
        <Input required placeholder="Adresse *" value={form.address} onChange={e => set('address', e.target.value)} />
        <Input placeholder="Complément d'adresse" value={form.additional_address} onChange={e => set('additional_address', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input required placeholder="Code postal *" value={form.zipcode} onChange={e => set('zipcode', e.target.value)} />
          <Input required placeholder="Ville *" value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
      </div>

      {/* Service */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prestation</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Type de ménage *</Label>
            <Select value={form.service_type} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Durée *</Label>
            <Select value={String(form.duration_minutes)} onValueChange={v => setDurationMinutes(parseInt(v, 10))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ADMIN_DURATIONS_MIN.map(m => <SelectItem key={m} value={String(m)}>{formatDuration(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Taux horaire (€/h) *</Label>
            <Input
              required
              type="number" step="0.01" min="0"
              value={form.hourly_rate}
              onChange={e => setRate(e.target.value)}
              placeholder="Ex: 26.00"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prix total (€) *</Label>
            <Input
              required
              type="number" step="0.01" min="0"
              value={form.total_price}
              onChange={e => set('total_price', e.target.value)}
              placeholder="0.00"
              className="bg-slate-50 font-semibold"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Prix recalculé automatiquement : taux horaire × {formatDuration(form.duration_minutes)}.
        </p>
      </div>

      {/* Schedule */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Planification</p>

        {/* Toggle recurrence */}
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
          <input type="checkbox" checked={useRecurrence} onChange={e => setUseRecurrence(e.target.checked)} className="rounded" />
          Créer plusieurs séances (récurrence)
        </label>

        {!useRecurrence && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Input required type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Heure *</Label>
              <Select value={form.start_time} onValueChange={v => set('start_time', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {useRecurrence && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Date de début *</Label>
              <Input required type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nombre de semaines</Label>
              <Input
                type="number" min="1" max="52" value={weeksCount}
                onChange={e => setWeeksCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Créneaux par semaine</Label>
              {weeklySlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={String(slot.day)} onValueChange={v => updateWeeklySlot(i, 'day', parseInt(v, 10))}>
                    <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d, idx) => <SelectItem key={idx} value={String(idx)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={slot.time} onValueChange={v => updateWeeklySlot(i, 'time', v)}>
                    <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ADMIN_TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {weeklySlots.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeWeeklySlot(i)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={addWeeklySlot}>
                <Plus className="w-3 h-3" /> Ajouter un créneau
              </Button>
            </div>

            {form.date && (
              <div className="bg-blue-50 rounded-md p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">→ {bookingCount} ménage{bookingCount > 1 ? 's' : ''} seront créés</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Intervenant</Label>
          <Select value={form.employee_id || 'unassigned'} onValueChange={v => set('employee_id', v === 'unassigned' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Non assigné</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</p>
        <div className="space-y-1">
          <Label className="text-xs">Statut réservation</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="confirmed">Confirmé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs">Instructions spéciales</Label>
        <textarea
          className="w-full border rounded-md p-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-slate-300"
          value={form.instructions}
          onChange={e => set('instructions', e.target.value)}
          placeholder="Digicode, clés, instructions particulières..."
        />
      </div>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.has_animals} onChange={e => set('has_animals', e.target.checked)} className="rounded" />
          Présence d'animaux
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.has_cleaning_supplies} onChange={e => set('has_cleaning_supplies', e.target.checked)} className="rounded" />
          Produits fournis
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
        <Button type="submit" disabled={loading || !form.client_id} className="bg-[#E95678] hover:bg-[#d44565] text-white">
          {loading ? 'Création...' : `Créer ${bookingCount > 1 ? `${bookingCount} ménages` : 'le ménage'}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
