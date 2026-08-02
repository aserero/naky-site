import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clients, Bookings, Invoices } from '@/api/db';
import { getSignedUrl, BUCKETS } from '@/api/storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, CheckCircle2, FileText, Eye, Download, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatTime, formatDuration, durationToHours } from '@/lib/format';

export default function ClientInvoicesTab({ month, year }) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => Clients.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => Bookings.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => Invoices.list(),
  });

  const clientInvoices = invoices
    .filter(inv => inv.type === 'client' || inv.type === 'b2b')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const markBilledMutation = useMutation({
    mutationFn: (bookingIds) =>
      Promise.all(bookingIds.map(id => Bookings.update(id, { billing_status: 'generated' }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Ménages marqués facturés');
    },
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
  });

  const openInvoiceFile = async (invoice, download = false) => {
    try {
      const url = await getSignedUrl(BUCKETS.invoices, invoice.file_path);
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invoice.number}.pdf`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      toast.error("Impossible d'ouvrir la facture : " + (err.message || 'inconnue'));
    }
  };

  const getClientName = (id) => {
    const client = clients.find(c => c.id === id);
    return client ? `${client.first_name} ${client.last_name}` : '—';
  };

  // Calculer le récap par client pour le mois sélectionné
  const clientsRecap = clients
    .map(client => {
      const clientBookings = bookings.filter(b =>
        b.client_id === client.id &&
        b.status === 'completed' &&
        b.date &&
        getMonth(parseISO(b.date)) === month &&
        getYear(parseISO(b.date)) === year
      );

      const totalHours = clientBookings.reduce((sum, b) => sum + durationToHours(b.duration_minutes), 0);
      const totalAmount = clientBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

      // Facturé = tous les ménages du mois ont billing_status = 'generated' ou 'paid'
      const allBilled = clientBookings.length > 0 && clientBookings.every(b =>
        b.billing_status === 'generated' || b.billing_status === 'paid'
      );

      return { client, bookings: clientBookings, totalHours, totalAmount, allBilled };
    })
    .filter(r => r.bookings.length > 0);

  const totalHoursMonth = clientsRecap.reduce((s, r) => s + r.totalHours, 0);
  const totalAmountMonth = clientsRecap.reduce((s, r) => s + r.totalAmount, 0);

  const markAsBilled = (clientId) => {
    const ids = bookings
      .filter(b =>
        b.client_id === clientId &&
        b.status === 'completed' &&
        b.date &&
        getMonth(parseISO(b.date)) === month &&
        getYear(parseISO(b.date)) === year &&
        b.billing_status !== 'generated' &&
        b.billing_status !== 'paid'
      )
      .map(b => b.id);
    if (ids.length > 0) markBilledMutation.mutate(ids);
  };

  return (
    <div className="space-y-6">
      {/* KPIs du mois */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-5 py-4 flex flex-wrap gap-x-10 gap-y-3 items-center">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total heures du mois</p>
          <p className="text-2xl font-bold text-slate-900">{formatDuration(Math.round(totalHoursMonth * 60))}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total à facturer clients</p>
          <p className="text-2xl font-bold text-[#E95678]">{totalAmountMonth.toFixed(2)} €</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Mois</p>
          <p className="text-sm font-semibold text-slate-700 capitalize">
            {format(new Date(year, month, 1), 'MMMM yyyy', { locale: fr })}
          </p>
        </div>
      </div>

      {/* Récapitulatif du mois par client */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E95678]" />
            Récapitulatif du mois
          </h2>
          <p className="text-sm text-slate-500">
            {clientsRecap.length} client{clientsRecap.length > 1 ? 's' : ''} avec activité
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {clientsRecap.length === 0 && (
            <p className="p-8 text-center text-slate-500">Aucun ménage terminé ce mois-ci</p>
          )}
          {clientsRecap.map(({ client, bookings: cBookings, totalHours, totalAmount, allBilled }) => {
            const isExpanded = expandedId === client.id;
            return (
              <div key={client.id}>
                {/* Ligne compacte (dépliable) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : client.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : client.id);
                    }
                  }}
                  className="w-full flex items-center gap-3 md:gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#E95678]/10 flex items-center justify-center text-[#E95678] font-bold text-sm shrink-0">
                    {client.first_name?.[0]}{client.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{client.first_name} {client.last_name}</p>
                    <p className="text-xs text-slate-500">
                      {cBookings.length} ménage{cBookings.length > 1 ? 's' : ''} terminé{cBookings.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="hidden sm:block w-20 text-right shrink-0">
                    <p className="text-sm font-medium text-slate-700">{formatDuration(Math.round(totalHours * 60))}</p>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <p className="text-sm font-semibold text-[#E95678]">{totalAmount.toFixed(2)} €</p>
                  </div>
                  {allBilled ? (
                    <Badge className="bg-green-100 text-green-700 border-none hover:bg-green-100 shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Facturé
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white gap-1 shrink-0"
                      onClick={(e) => { e.stopPropagation(); markAsBilled(client.id); }}
                      disabled={markBilledMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Marquer facturé
                    </Button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Zone dépliée : détail des ménages du mois */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 bg-slate-50/60 border-t border-slate-100 space-y-1.5">
                    {cBookings.map(b => (
                      <div key={b.id} className="flex justify-between items-center text-xs text-slate-500 bg-white border border-slate-100 rounded px-3 py-1.5">
                        <span>
                          {b.date ? format(parseISO(b.date), 'dd MMMM', { locale: fr }) : '—'} · {formatTime(b.start_time)} · {formatDuration(b.duration_minutes)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">{b.total_price} €</span>
                          {(b.billing_status === 'generated' || b.billing_status === 'paid') && (
                            <Badge className="bg-green-100 text-green-700 border-none hover:bg-green-100 text-[10px] py-0">Facturé</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Factures clients enregistrées (type 'client') */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#E95678]" />
            Factures clients enregistrées
          </h2>
          <p className="text-sm text-slate-500">
            {clientInvoices.length} facture{clientInvoices.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {clientInvoices.length === 0 && (
            <p className="p-8 text-center text-slate-500">Aucune facture client enregistrée</p>
          )}
          {clientInvoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center gap-3 md:gap-4 px-4 py-3">
              <div className="w-9 h-9 bg-[#E95678]/10 rounded-lg hidden sm:flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-[#E95678]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 text-sm">{invoice.number}</p>
                  <Badge className={`border-none text-xs shrink-0 ${invoice.status === 'paid' ? 'bg-green-100 text-green-700 hover:bg-green-100' : invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}`}>
                    {invoice.status === 'paid' ? 'Payée' : invoice.status === 'pending' ? 'En attente' : 'Brouillon'}
                  </Badge>
                  {invoice.type === 'b2b' && (
                    <Badge className="border-none text-xs shrink-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">B2B</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {invoice.client_id ? getClientName(invoice.client_id) : (invoice.recipient_name || '—')}
                  {invoice.date && (
                    <span className="text-slate-400"> · émise le {format(parseISO(invoice.date), 'dd MMM yyyy', { locale: fr })}</span>
                  )}
                </p>
              </div>
              <p className="font-semibold text-slate-900 text-sm shrink-0">{Number(invoice.amount || 0).toFixed(2)} €</p>
              {invoice.file_path && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-blue-600 hover:bg-blue-50" onClick={() => openInvoiceFile(invoice)}>
                    <Eye className="w-3.5 h-3.5" /> Voir
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => openInvoiceFile(invoice, true)} title="Télécharger">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
