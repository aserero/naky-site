import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import BookingCreateForm from '@/components/admin/BookingCreateForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  MapPin,
  User,
  Search,
  Plus,
  CreditCard,
  FileCheck,
  RefreshCw,
  XCircle,
  FileText,
  Pencil,
  Trash2,
  ChevronDown,
  Phone,
  Mail
} from 'lucide-react';
import EditBookingDialog from '@/components/admin/EditBookingDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Bookings, Clients, Employees } from '@/api/db';
import { useBookingBilling } from '@/components/admin/useBookingBilling';
import {
  SERVICE_LABELS,
  RECURRENCE_LABELS,
  BOOKING_STATUS_LABELS,
  BILLING_STATUS_LABELS,
  AI_STATUS_LABELS,
} from '@/lib/constants';
import { formatDuration, formatTime, formatPrice } from '@/lib/format';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Couleurs du statut AI du client (clients.ai_status)
const AI_STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-600',
  completed: 'bg-blue-100 text-blue-800',
  ai_requested: 'bg-yellow-100 text-yellow-800',
  ai_accepted: 'bg-green-100 text-green-800',
  ai_refused: 'bg-red-100 text-red-800',
};

const AI_STATUS_BORDERS = {
  pending: 'border-l-4 border-l-slate-300',
  completed: 'border-l-4 border-l-blue-400',
  ai_requested: 'border-l-4 border-l-yellow-400',
  ai_accepted: 'border-l-4 border-l-green-400',
  ai_refused: 'border-l-4 border-l-red-400',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const BILLING_COLORS = {
  none: 'bg-slate-100 text-slate-500',
  avance_immediate: 'bg-blue-100 text-blue-800',
  generated: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
};

// Libellés courts pour la ligne compacte
const SERVICE_SHORT_LABELS = {
  regular: 'Régulier',
  one_time: 'Ponctuel',
  spring: 'Printemps',
  enterprise: 'Entreprise',
};

export default function AdminBookings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [expandedId, setExpandedId] = useState(null);

  const queryClient = useQueryClient();
  const { chargeStripe, payUrssaf, openInvoice, chargingBookingId } = useBookingBilling();

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => Bookings.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => Employees.list(),
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => Clients.list(),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Bookings.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    onError: (err) => toast.error(err.message || 'Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Bookings.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Ménage supprimé');
    },
    onError: (err) => toast.error(err.message || 'Erreur lors de la suppression'),
  });

  const clientOf = (booking) => clients.find(c => c.id === booking.client_id);

  const filteredBookings = bookings.filter(booking => {
    const client = clientOf(booking);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      client?.last_name?.toLowerCase().includes(q) ||
      client?.first_name?.toLowerCase().includes(q) ||
      client?.email?.toLowerCase().includes(q) ||
      client?.phone?.includes(searchQuery) ||
      booking.address?.toLowerCase().includes(q) ||
      booking.city?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? booking.status !== 'completed' && booking.status !== 'cancelled' : booking.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  // Assignation d'une employée — passage auto en "confirmed" UNIQUEMENT depuis "pending".
  // L'email d'assignation part d'un Database Webhook côté serveur.
  const handleAssignEmployee = (booking, employeeId) => {
    const data = { employee_id: employeeId === 'unassigned' ? null : employeeId };
    if (employeeId !== 'unassigned' && booking.status === 'pending') {
      data.status = 'confirmed';
    }
    updateMutation.mutate({ id: booking.id, data });
  };

  const handleCancelBooking = (booking) => {
    updateMutation.mutate({ id: booking.id, data: { status: 'cancelled' } });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ménages</h1>
            <p className="text-slate-500">{bookings.length} interventions au total</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#E95678] hover:bg-[#d44565] text-white gap-2">
                <Plus className="w-4 h-4" /> Nouveau ménage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouveau ménage</DialogTitle>
              </DialogHeader>
              <BookingCreateForm
                employees={employees}
                clients={clients}
                onClose={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par client, adresse, ville..."
              className="pl-10 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="active">En cours (hors terminés)</SelectItem>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="confirmed">Confirmé</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Compteur de résultats */}
        <p className="text-sm text-slate-500 -mb-3">
          {filteredBookings.length} intervention{filteredBookings.length > 1 ? 's' : ''}
        </p>

        {/* Bookings list — lignes compactes dépliables */}
        <div className="space-y-2">
          {filteredBookings.map((booking) => {
            const bookingClient = clientOf(booking);
            const clientName = bookingClient
              ? `${bookingClient.first_name} ${bookingClient.last_name}`
              : 'Client supprimé';
            const aiStatus = bookingClient?.ai_status && bookingClient.ai_status !== 'none'
              ? bookingClient.ai_status
              : null;
            const borderColor = aiStatus ? (AI_STATUS_BORDERS[aiStatus] || '') : '';
            const employee = employees.find(e => e.id === booking.employee_id);
            const isExpanded = expandedId === booking.id;
            const dateLabel = booking.date
              ? format(parseISO(booking.date), 'd MMM', { locale: fr })
              : 'Sans date';
            const timeLabel = formatTime(booking.start_time);
            const serviceShort = SERVICE_SHORT_LABELS[booking.service_type] || booking.service_type;
            const durationLabel = formatDuration(booking.duration_minutes);
            const showBillingBadge = (booking.billing_status || 'none') !== 'none';

            return (
            <div
              key={booking.id}
              className={`bg-white rounded-lg border border-slate-100 shadow-sm transition-shadow ${isExpanded ? 'shadow-md' : ''} ${borderColor}`}
            >
              {/* ---- Ligne compacte (cliquable) ---- */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                {/* Desktop */}
                <div className="hidden md:grid md:grid-cols-[110px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto_90px_20px] items-center gap-3">
                  <div className="text-sm font-medium text-slate-900 whitespace-nowrap">
                    {dateLabel}{timeLabel && <span className="text-slate-500 font-normal"> · {timeLabel}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{clientName}</p>
                    {booking.city && <p className="text-xs text-slate-400 truncate">{booking.city}</p>}
                  </div>
                  <div className="text-sm text-slate-600 truncate">
                    {serviceShort}{durationLabel && ` · ${durationLabel}`}
                    {booking.recurrence && booking.recurrence !== 'none' && (
                      <RefreshCw className="w-3 h-3 inline-block ml-1.5 text-slate-400 align-[-1px]" />
                    )}
                  </div>
                  <div className={`text-sm truncate ${employee ? 'text-slate-600' : 'text-orange-500'}`}>
                    {employee ? employee.first_name : 'Non assigné'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={`border-none text-xs ${STATUS_COLORS[booking.status] || 'bg-yellow-100 text-yellow-800'}`}>
                      {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                    </Badge>
                    {showBillingBadge && (
                      <Badge className={`border-none text-[10px] px-1.5 ${BILLING_COLORS[booking.billing_status]}`}>
                        {BILLING_STATUS_LABELS[booking.billing_status]}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 text-right whitespace-nowrap">
                    {booking.total_price != null ? formatPrice(booking.total_price) : '—'}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Mobile */}
                <div className="md:hidden space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{clientName}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-slate-900">
                        {booking.total_price != null ? formatPrice(booking.total_price) : '—'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{dateLabel}{timeLabel && ` · ${timeLabel}`}</span>
                    <span>{serviceShort}{durationLabel && ` · ${durationLabel}`}</span>
                    <span className={employee ? '' : 'text-orange-500'}>
                      {employee ? employee.first_name : 'Non assigné'}
                    </span>
                    <Badge className={`border-none text-[10px] px-1.5 ${STATUS_COLORS[booking.status] || 'bg-yellow-100 text-yellow-800'}`}>
                      {BOOKING_STATUS_LABELS[booking.status] || booking.status}
                    </Badge>
                    {showBillingBadge && (
                      <Badge className={`border-none text-[10px] px-1.5 ${BILLING_COLORS[booking.billing_status]}`}>
                        {BILLING_STATUS_LABELS[booking.billing_status]}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>

              {/* ---- Zone dépliée ---- */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 py-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Infos client & intervention */}
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p>{booking.address}</p>
                          {booking.additional_address && <p className="text-slate-400 text-xs">{booking.additional_address}</p>}
                          <p>{booking.zipcode} {booking.city}</p>
                        </div>
                      </div>
                      {bookingClient?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{bookingClient.phone}</span>
                        </div>
                      )}
                      {bookingClient?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{bookingClient.email}</span>
                        </div>
                      )}
                      {aiStatus && (
                        <Badge className={`border-none text-xs font-normal ${AI_STATUS_COLORS[aiStatus] || 'bg-slate-100 text-slate-500'}`}>
                          {AI_STATUS_LABELS[aiStatus] || aiStatus}
                        </Badge>
                      )}
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Créé le {booking.created_at ? format(parseISO(booking.created_at), 'd MMM yyyy', { locale: fr }) : '—'}
                        </span>
                        {booking.hourly_rate != null && (
                          <span>{formatPrice(booking.hourly_rate)}/h</span>
                        )}
                        <span>{SERVICE_LABELS[booking.service_type] || booking.service_type}</span>
                        {booking.recurrence && booking.recurrence !== 'none' && (
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            {RECURRENCE_LABELS[booking.recurrence] || booking.recurrence}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Intervenant & Facturation */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Intervenant</p>
                        <Select
                          value={booking.employee_id || "unassigned"}
                          onValueChange={(value) => handleAssignEmployee(booking, value)}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder="Non assigné" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Non assigné</SelectItem>
                            {employees.map(employee => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.first_name} {employee.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Statut Facture */}
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Facturation</p>
                        <Select
                          value={booking.billing_status || 'none'}
                          onValueChange={(value) => updateMutation.mutate({ id: booking.id, data: { billing_status: value } })}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(BILLING_STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Paiement + actions */}
                    <div className="space-y-2 flex flex-col justify-start">
                      <p className="text-xs text-slate-400">Paiement</p>
                      {booking.status === 'cancelled' ? (
                        <p className="text-xs text-red-400 italic">Ménage annulé</p>
                      ) : booking.status !== 'confirmed' && !booking.invoice_file_path ? (
                        <p className="text-xs text-slate-400 italic">Disponible une fois confirmé</p>
                      ) : booking.invoice_file_path ? (
                        // Facture générée → téléchargement (URL signée, bucket privé)
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 w-full text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => openInvoice(booking)}
                        >
                          <FileText className="w-4 h-4" />
                          Voir la facture ✓
                        </Button>
                      ) : bookingClient?.ai_status === 'ai_accepted' ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-2 w-full">
                              <FileCheck className="w-4 h-4" />
                              Paiement URSSAF
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Déclencher le paiement URSSAF ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Vous allez déclencher le paiement URSSAF pour <strong>{clientName}</strong> d'un montant de <strong>{formatPrice(booking.total_price)}</strong>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => payUrssaf(booking)}
                              >
                                Confirmer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 w-full text-slate-600 border-slate-200"
                              disabled={chargingBookingId === booking.id}
                            >
                              {chargingBookingId === booking.id ? (
                                <><RefreshCw className="w-4 h-4 animate-spin" /> Prélèvement...</>
                              ) : (
                                <><CreditCard className="w-4 h-4" /> Prélever Stripe</>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer le prélèvement ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Vous allez prélever <strong>{formatPrice(booking.total_price)}</strong> sur la carte de <strong>{clientName}</strong>. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-slate-900 hover:bg-slate-800 text-white"
                                onClick={() => chargeStripe(booking)}
                              >
                                Confirmer le prélèvement
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 w-full text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => updateMutation.mutate({ id: booking.id, data: { status: 'completed' } })}
                        >
                          <FileCheck className="w-4 h-4" />
                          Terminer le ménage
                        </Button>
                      )}

                      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-2 w-full text-red-600 border-red-200 hover:bg-red-50">
                              <XCircle className="w-4 h-4" />
                              Annuler le RDV
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action va annuler la réservation de <strong>{clientName}</strong> prévue le {booking.date ? format(parseISO(booking.date), 'd MMM yyyy', { locale: fr }) : '—'} à {formatTime(booking.start_time)}. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Retour</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleCancelBooking(booking)}
                              >
                                Confirmer l'annulation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 gap-2 text-slate-500 hover:text-slate-700"
                          onClick={() => setEditingBooking(booking)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Modifier
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="flex-1 gap-2 text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce ménage ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Le ménage de <strong>{clientName}</strong> sera définitivement supprimé.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteMutation.mutate(booking.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  {booking.instructions && (
                    <p className="text-xs text-slate-400 bg-slate-50 rounded px-3 py-2 italic">
                      📝 {booking.instructions}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

          {filteredBookings.length === 0 && (
            <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed">
              Aucune intervention trouvée
            </div>
          )}
        </div>
      </div>
      {editingBooking && (
        <EditBookingDialog
          booking={editingBooking}
          open={!!editingBooking}
          onClose={() => setEditingBooking(null)}
        />
      )}
    </AdminLayout>
  );
}
