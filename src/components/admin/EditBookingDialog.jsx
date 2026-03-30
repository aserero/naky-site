import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function EditBookingDialog({ booking, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    date: booking?.date || '',
    time: booking?.time || '',
    duration: booking?.duration || '',
    hours: booking?.hours ?? '',
    hourly_rate: booking?.hourly_rate ?? '',
    total_price: booking?.total_price || '',
    service_type: booking?.service_type || 'regular',
    recurrence: booking?.recurrence || 'none',
    address: booking?.address || '',
    zipcode: booking?.zipcode || '',
    city: booking?.city || '',
    instructions: booking?.instructions || '',
  });

  // Recalcule le prix total quand hours ou hourly_rate changent
  useEffect(() => {
    const h = parseFloat(form.hours);
    const r = parseFloat(form.hourly_rate);
    if (!isNaN(h) && !isNaN(r) && h > 0 && r > 0) {
      setForm(f => ({ ...f, total_price: (h * r).toFixed(2) }));
    }
  }, [form.hours, form.hourly_rate]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Booking.update(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Ménage mis à jour');
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      ...form,
      hours: form.hours !== '' ? parseFloat(form.hours) : undefined,
      hourly_rate: form.hourly_rate !== '' ? parseFloat(form.hourly_rate) : undefined,
      total_price: form.total_price ? parseFloat(form.total_price) : undefined,
    });
  };

  const computedTotal = (() => {
    const h = parseFloat(form.hours);
    const r = parseFloat(form.hourly_rate);
    if (!isNaN(h) && !isNaN(r) && h > 0 && r > 0) return (h * r).toFixed(2);
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
              <Label>Heure (ex: 9h)</Label>
              <Input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="9h" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Durée (ex: 3h)</Label>
              <Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="3h" />
            </div>
            <div className="space-y-1">
              <Label>Nombre d'heures</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                placeholder="ex: 3"
              />
            </div>
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
                {form.hours}h × {form.hourly_rate}€/h = <span className="text-base font-bold">{computedTotal} €</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Type de service</Label>
              <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
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
              <Label>Récurrence</Label>
              <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="twice_weekly">2x / semaine</SelectItem>
                  <SelectItem value="biweekly">Bi-mensuel</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
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