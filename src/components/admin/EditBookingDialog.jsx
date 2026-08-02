import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bookings } from '@/api/db';
import {
  SERVICE_LABELS,
  RECURRENCE_LABELS,
  ADMIN_DURATIONS_MIN,
  ADMIN_TIME_SLOTS,
} from '@/lib/constants';
import { formatDuration, timeToHHMM } from '@/lib/format';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function EditBookingDialog({ booking, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    date: booking?.date || '',
    start_time: timeToHHMM(booking?.start_time) || '09:00',
    duration_minutes: booking?.duration_minutes ?? 180,
    hourly_rate: booking?.hourly_rate ?? '',
    total_price: booking?.total_price ?? '',
    service_type: booking?.service_type || 'regular',
    recurrence: booking?.recurrence || 'none',
    address: booking?.address || '',
    zipcode: booking?.zipcode || '',
    city: booking?.city || '',
    instructions: booking?.instructions || '',
  });

  // Recalcule le prix total quand la durée ou le tarif horaire changent
  useEffect(() => {
    const r = parseFloat(form.hourly_rate);
    const m = form.duration_minutes;
    if (!isNaN(r) && r > 0 && m > 0) {
      const total = (Math.round(r * (m / 60) * 100) / 100).toFixed(2);
      setForm(f => (String(f.total_price) === total ? f : { ...f, total_price: total }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.duration_minutes, form.hourly_rate]);

  const updateMutation = useMutation({
    mutationFn: (data) => Bookings.update(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Ménage mis à jour');
      onClose();
    },
    onError: (err) => toast.error(err.message || 'Erreur lors de la mise à jour'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      date: form.date,
      start_time: form.start_time,
      duration_minutes: form.duration_minutes,
      hourly_rate: form.hourly_rate !== '' ? parseFloat(form.hourly_rate) : undefined,
      total_price: form.total_price !== '' ? parseFloat(form.total_price) : undefined,
      service_type: form.service_type,
      recurrence: form.recurrence,
      address: form.address,
      zipcode: form.zipcode,
      city: form.city,
      instructions: form.instructions || null,
    });
  };

  const computedTotal = (() => {
    const r = parseFloat(form.hourly_rate);
    if (!isNaN(r) && r > 0 && form.duration_minutes > 0) {
      return (Math.round(r * (form.duration_minutes / 60) * 100) / 100).toFixed(2);
    }
    return null;
  })();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le ménage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Heure</Label>
              <Select value={form.start_time} onValueChange={v => setForm(f => ({ ...f, start_time: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Durée</Label>
            <Select value={String(form.duration_minutes)} onValueChange={v => setForm(f => ({ ...f, duration_minutes: parseInt(v, 10) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ADMIN_DURATIONS_MIN.map(m => <SelectItem key={m} value={String(m)}>{formatDuration(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Tarif horaire + Prix total calculé */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tarification</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tarif horaire (€/h)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.hourly_rate}
                  onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                  placeholder="ex: 26"
                />
              </div>
              <div className="space-y-1">
                <Label>Prix total (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.total_price}
                  onChange={e => setForm(f => ({ ...f, total_price: e.target.value }))}
                  placeholder="calculé auto"
                />
              </div>
            </div>
            {computedTotal && (
              <p className="text-xs text-green-700 font-medium">
                {formatDuration(form.duration_minutes)} × {form.hourly_rate}€/h = <span className="text-base font-bold">{computedTotal} €</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Type de service</Label>
              <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Récurrence</Label>
              <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Adresse</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Code postal</Label>
              <Input value={form.zipcode} onChange={e => setForm(f => ({ ...f, zipcode: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Ville</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Instructions</Label>
            <Input value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
