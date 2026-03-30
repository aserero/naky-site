import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { X, Plus } from 'lucide-react';
import { addDays, addWeeks, format } from 'date-fns';

const DURATIONS = ['1h', '1h30', '2h', '2h30', '3h', '4h', '5h', '6h', '8h'];
const TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Get next occurrence of a given weekday (0=Monday ... 6=Sunday) from a start date
function nextWeekday(startDate, targetDay) {
  const d = new Date(startDate);
  // JS getDay(): 0=Sun, 1=Mon...
  // Our index: 0=Mon ... 6=Sun
  const jsDay = (targetDay + 1) % 7;
  let diff = jsDay - d.getDay();
  if (diff < 0) diff += 7;
  if (diff === 0) diff = 7; // at least next week
  d.setDate(d.getDate() + diff);
  return d;
}

export default function BookingCreateForm({ employees, clients, onClose }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientList, setShowClientList] = useState(false);

  const [form, setForm] = useState({
    client_id: '',
    gender: 'Mme',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    zipcode: '',
    city: '',
    additional_address: '',
    service_type: 'regular',
    duration: '3h',
    date: '',
    time: '09:00',
    employee_id: '',
    has_animals: false,
    has_cleaning_supplies: false,
    instructions: '',
    total_price: '',
    status: 'confirmed',
    urssaf_status: 'none',
  });

  // Recurrence state
  const [useRecurrence, setUseRecurrence] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('weekly'); // 'weekly' | 'custom'
  const [weeklySlots, setWeeklySlots] = useState([{ day: 0, time: '09:00' }]); // for weekly recurrence
  const [weeksCount, setWeeksCount] = useState(4);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

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
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      zipcode: client.zipcode || '',
      city: client.city || '',
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

  // Preview generated bookings
  const generatedDates = useMemo(() => {
    if (!useRecurrence || !form.date) return [];
    const startDate = new Date(form.date);
    const dates = [];
    if (recurrenceType === 'weekly') {
      for (let w = 0; w < weeksCount; w++) {
        for (const slot of weeklySlots) {
          const base = nextWeekday(addWeeks(startDate, w === 0 ? -1 : w - 1), slot.day);
          // For w=0: find first occurrence from startDate
          const d = w === 0 ? nextWeekday(new Date(form.date + 'T00:00:00'), slot.day) : addWeeks(generatedDates.find(x => x.slotDay === slot.day)?.date || nextWeekday(new Date(form.date + 'T00:00:00'), slot.day), w);
          dates.push({ date: d, time: slot.time, slotDay: slot.day });
        }
      }
    }
    return dates;
  }, [useRecurrence, form.date, recurrenceType, weeklySlots, weeksCount]);

  // Simpler recurrence computation for actual booking creation
  const computeBookingDates = () => {
    if (!useRecurrence || !form.date) return [{ date: form.date, time: form.time }];
    const startDate = new Date(form.date + 'T00:00:00');
    const results = [];
    if (recurrenceType === 'weekly') {
      // For each slot, find first occurrence >= startDate, then repeat weeksCount times
      for (const slot of weeklySlots) {
        const jsDay = (slot.day + 1) % 7; // 0=Mon->1, 6=Sun->0
        for (let w = 0; w < weeksCount; w++) {
          const first = nextWeekday(startDate, slot.day);
          const d = addWeeks(first, w);
          results.push({ date: format(d, 'yyyy-MM-dd'), time: slot.time });
        }
      }
    }
    return results;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const baseBooking = {
        address: form.address,
        zipcode: form.zipcode,
        city: form.city,
        additional_address: form.additional_address,
        service_type: form.service_type,
        duration: form.duration,
        recurrence: useRecurrence ? (recurrenceType === 'weekly' ? 'weekly' : 'none') : 'none',
        has_animals: form.has_animals,
        has_cleaning_supplies: form.has_cleaning_supplies,
        instructions: form.instructions,
        total_price: form.total_price ? parseFloat(form.total_price) : undefined,
        status: form.status,
        employee_id: form.employee_id || undefined,
        client_id: form.client_id || undefined,
        urssaf_status: form.urssaf_status,
        contact_details: {
          gender: form.gender,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email,
        }
      };

      if (useRecurrence) {
        const dates = computeBookingDates();
        for (const { date, time } of dates) {
          await base44.entities.Booking.create({ ...baseBooking, date, time });
        }
      } else {
        await base44.entities.Booking.create({ ...baseBooking, date: form.date, time: form.time });
      }

      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onClose();
    } catch (err) {
      alert('Erreur lors de la création: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const bookingCount = useRecurrence ? computeBookingDates().length : 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

      {/* Client search */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-slate-700">Client existant (optionnel)</Label>
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
          {form.client_id && (
            <Badge className="mt-1 bg-blue-100 text-blue-700 border-none text-xs">
              Client lié : {form.first_name} {form.last_name}
            </Badge>
          )}
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
      </div>

      {/* Contact */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Coordonnées</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Civilité</Label>
            <Select value={form.gender} onValueChange={v => set('gender', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">M.</SelectItem>
                <SelectItem value="Mme">Mme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prénom *</Label>
            <Input required value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nom *</Label>
            <Input required value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Téléphone</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Adresse</p>
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
            <Select value={form.service_type} onValueChange={v => set('service_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Régulier</SelectItem>
                <SelectItem value="one_time">Ponctuel</SelectItem>
                <SelectItem value="spring">Grand ménage</SelectItem>
                <SelectItem value="enterprise">Entreprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Durée *</Label>
            <Select value={form.duration} onValueChange={v => set('duration', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prix total (€)</Label>
          <Input type="number" step="0.01" value={form.total_price} onChange={e => set('total_price', e.target.value)} placeholder="0.00" />
        </div>
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
              <Select value={form.time} onValueChange={v => set('time', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                  <Select value={String(slot.day)} onValueChange={v => updateWeeklySlot(i, 'day', parseInt(v))}>
                    <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d, idx) => <SelectItem key={idx} value={String(idx)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={slot.time} onValueChange={v => updateWeeklySlot(i, 'time', v)}>
                    <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Statuts</p>
        <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-1">
            <Label className="text-xs">Statut URSSAF</Label>
            <Select value={form.urssaf_status} onValueChange={v => set('urssaf_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="requested">Demandé</SelectItem>
                <SelectItem value="accepted">Accepté</SelectItem>
                <SelectItem value="refused">Refusé</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        <Button type="submit" disabled={loading} className="bg-[#E95678] hover:bg-[#d44565] text-white">
          {loading ? 'Création...' : `Créer ${bookingCount > 1 ? `${bookingCount} ménages` : 'le ménage'}`}
        </Button>
      </DialogFooter>
    </form>
  );
}