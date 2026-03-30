import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, User } from 'lucide-react';

function parseDurationToHours(duration) {
  if (!duration) return 0;
  const match = duration.match(/^(\d+)h(\d+)?/);
  if (match) return parseInt(match[1], 10) + (match[2] ? parseInt(match[2], 10) / 60 : 0);
  const numMatch = duration.match(/(\d+(?:[.,]\d+)?)/);
  return numMatch ? parseFloat(numMatch[1].replace(',', '.')) : 0;
}

export default function ClientInvoicesTab() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now));
  const [selectedYear, setSelectedYear] = useState(getYear(now));

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // Calculer le récap par client pour le mois sélectionné
  const clientsRecap = clients
    .map(client => {
      const clientBookings = bookings.filter(b =>
        b.client_id === client.id &&
        b.status === 'completed' &&
        b.date &&
        getMonth(parseISO(b.date)) === selectedMonth &&
        getYear(parseISO(b.date)) === selectedYear
      );

      const totalHours = clientBookings.reduce((sum, b) => sum + parseDurationToHours(b.duration), 0);
      const totalAmount = clientBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

      // Facturé = tous les ménages du mois ont billing_status = 'generated' ou 'paid'
      const allBilled = clientBookings.length > 0 && clientBookings.every(b =>
        b.billing_status === 'generated' || b.billing_status === 'paid'
      );

      return { client, bookings: clientBookings, totalHours, totalAmount, allBilled };
    })
    .filter(r => r.bookings.length > 0);

  const markAsBilled = (clientId) => {
    const clientBookings = bookings.filter(b =>
      b.client_id === clientId &&
      b.status === 'completed' &&
      b.date &&
      getMonth(parseISO(b.date)) === selectedMonth &&
      getYear(parseISO(b.date)) === selectedYear &&
      b.billing_status !== 'generated' &&
      b.billing_status !== 'paid'
    );
    clientBookings.forEach(b => {
      updateMutation.mutate({ id: b.id, data: { billing_status: 'generated' } });
    });
  };

  return (
    <div className="space-y-6">
      {/* Sélecteur de mois */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E95678]" />
            Récapitulatif mensuel par client
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 capitalize min-w-[130px] text-center">
              {format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy', { locale: fr })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Total du mois clients */}
        {clientsRecap.length > 0 && (() => {
          const totalHours = clientsRecap.reduce((s, r) => s + r.totalHours, 0);
          const totalAmount = clientsRecap.reduce((s, r) => s + r.totalAmount, 0);
          return (
            <div className="bg-[#E95678]/5 border border-[#E95678]/20 rounded-xl px-5 py-4 flex flex-wrap gap-6 items-center mb-4">
              <div>
                <p className="text-xs text-[#E95678] font-medium uppercase tracking-wide">Total heures du mois</p>
                <p className="text-2xl font-bold text-[#d44565]">{totalHours.toFixed(1)} h</p>
              </div>
              <div>
                <p className="text-xs text-[#E95678] font-medium uppercase tracking-wide">Total à facturer clients</p>
                <p className="text-2xl font-bold text-[#d44565]">{totalAmount.toFixed(2)} €</p>
              </div>
            </div>
          );
        })()}

        {clientsRecap.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Aucun ménage terminé pour ce mois.
          </p>
        ) : (
          <div className="space-y-3">
            {clientsRecap.map(({ client, bookings: cBookings, totalHours, totalAmount, allBilled }) => (
              <div key={client.id} className="border border-slate-100 rounded-xl p-4 hover:border-[#E95678]/20 transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#E95678]/10 flex items-center justify-center text-[#E95678] font-bold text-sm shrink-0">
                      {client.first_name?.[0]}{client.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{client.first_name} {client.last_name}</p>
                      <p className="text-xs text-slate-400">{cBookings.length} ménage{cBookings.length > 1 ? 's' : ''} terminé{cBookings.length > 1 ? 's' : ''} ce mois</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total heures</p>
                      <p className="font-bold text-slate-800">{totalHours.toFixed(1)}h</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Montant à facturer</p>
                      <p className="font-bold text-[#E95678] text-lg">{totalAmount.toFixed(2)} €</p>
                    </div>

                    {allBilled ? (
                      <Badge className="bg-green-100 text-green-700 border-none flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Facturé
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        onClick={() => markAsBilled(client.id)}
                        disabled={updateMutation.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Marquer facturé
                      </Button>
                    )}
                  </div>
                </div>

                {/* Détail des ménages */}
                <div className="mt-3 space-y-1.5">
                  {cBookings.map(b => (
                    <div key={b.id} className="flex justify-between items-center text-xs text-slate-500 bg-slate-50 rounded px-3 py-1.5">
                      <span>{b.date ? format(parseISO(b.date), 'dd MMMM', { locale: fr }) : '—'} · {b.time || ''} · {b.duration}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{b.total_price} €</span>
                        {(b.billing_status === 'generated' || b.billing_status === 'paid') && (
                          <Badge className="bg-green-100 text-green-700 border-none text-[10px] py-0">Facturé</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}