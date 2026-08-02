import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bookings } from '@/api/db';
import { ADMIN_DURATIONS_MIN, ADMIN_TIME_SLOTS } from '@/lib/constants';
import { formatDuration, timeToHHMM } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addWeeks, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Repeat } from 'lucide-react';

export default function RecurringBookingDialog({ booking, client, open, onClose }) {
  const queryClient = useQueryClient();

  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [frequency, setFrequency] = useState('weekly');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);

  // Synchronise les valeurs quand un booking source est sélectionné
  // (le dialog est monté en permanence avec booking=null au départ)
  useEffect(() => {
    if (booking) {
      setStartTime(timeToHHMM(booking.start_time) || '09:00');
      setDurationMinutes(booking.duration_minutes ?? 180);
      setEndDate('');
      setPreview([]);
    }
  }, [booking]);

  // Calcule les dates de répétition
  const computeDates = () => {
    if (!booking?.date || !endDate) return [];
    try {
      const start = parseISO(booking.date);
      const end = parseISO(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
      const step = frequency === 'weekly' ? 1 : 2;
      const dates = [];
      let current = addWeeks(start, step);
      let safety = 0;
      while (current <= end && safety < 200) {
        dates.push(format(current, 'yyyy-MM-dd'));
        current = addWeeks(current, step);
        safety++;
      }
      return dates;
    } catch {
      return [];
    }
  };

  const computedDates = computeDates();

  const handlePreview = () => {
    setPreview(computeDates());
  };

  const handleCreate = async () => {
    const dates = computedDates;
    if (dates.length === 0) return;
    setLoading(true);
    try {
      // Spread du booking source en excluant les champs propres à chaque réservation
      // (identité, facturation, paiement, statut) — total_price recalculé sur la durée saisie.
      const {
        id, created_at, updated_at, abby_invoice_id, invoice_file_path,
        billing_status, status, payment_method,
        ...base
      } = booking;
      const totalPrice = Math.round(booking.hourly_rate * (durationMinutes / 60) * 100) / 100;
      const rows = dates.map(date => ({
        ...base,
        date,
        start_time: startTime,
        duration_minutes: durationMinutes,
        total_price: totalPrice,
      }));
      await Bookings.createMany(rows);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(`${rows.length} ménage${rows.length > 1 ? 's' : ''} créé${rows.length > 1 ? 's' : ''}`);
      onClose();
    } catch (err) {
      toast.error('Erreur lors de la création : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-green-600" />
            Créer des ménages en répétition
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
            <p className="font-semibold">{client ? `${client.first_name} ${client.last_name}` : 'Client supprimé'}</p>
            <p className="text-slate-500">{booking.address}, {booking.city}</p>
            <p className="text-slate-500">À partir du {format(parseISO(booking.date), 'dd MMMM yyyy', { locale: fr })}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Heure</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Durée</Label>
              <Select value={String(durationMinutes)} onValueChange={v => setDurationMinutes(parseInt(v, 10))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_DURATIONS_MIN.map(m => <SelectItem key={m} value={String(m)}>{formatDuration(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Fréquence</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Toutes les semaines</SelectItem>
                <SelectItem value="biweekly">Toutes les 2 semaines</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date de fin</Label>
            <Input
              type="date"
              value={endDate}
              min={booking.date}
              onChange={e => {
                setEndDate(e.target.value);
                setPreview([]);
              }}
            />
          </div>

          {endDate && (
            <Button variant="outline" size="sm" className="w-full" onClick={handlePreview}>
              <Calendar className="w-4 h-4 mr-2" />
              Prévisualiser les dates ({computedDates.length} ménages)
            </Button>
          )}

          {preview.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-green-800 mb-2">{preview.length} ménages seront créés :</p>
              <ul className="space-y-1">
                {preview.map(d => (
                  <li key={d} className="text-xs text-green-700">
                    {format(parseISO(d), 'EEEE dd MMMM yyyy', { locale: fr })} à {startTime}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={handleCreate}
            disabled={!endDate || computedDates.length === 0 || loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Création...' : `Créer ${computedDates.length} ménages`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
