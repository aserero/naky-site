import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User,
  Repeat, CheckCircle2, Pencil, Trash2, XCircle, Plus, CreditCard, FileCheck,
  RefreshCw, FileText, AlertCircle
} from 'lucide-react';
import RecurringBookingDialog from '@/components/admin/RecurringBookingDialog';
import EditBookingDialog from '@/components/admin/EditBookingDialog';
import BookingCreateForm from '@/components/admin/BookingCreateForm';
import { Bookings, Clients, Employees } from '@/api/db';
import { useBookingBilling } from '@/components/admin/useBookingBilling';
import { BOOKING_STATUS_LABELS, BILLING_STATUS_LABELS } from '@/lib/constants';
import { formatDuration, formatTime, formatPrice } from '@/lib/format';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek, parseISO, isBefore, startOfDay
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recurringBooking, setRecurringBooking] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [showPastUnfinished, setShowPastUnfinished] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const queryClient = useQueryClient();
  const { chargeStripe, payUrssaf, openInvoice, chargingBookingId } = useBookingBilling();

  const { data: bookings } = useQuery({ queryKey: ['bookings'], queryFn: () => Bookings.list(), initialData: [] });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => Employees.list(), initialData: [] });
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: () => Clients.list(), initialData: [] });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Bookings.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    onError: (err) => toast.error(err.message || 'Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Bookings.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Ménage supprimé'); },
    onError: (err) => toast.error(err.message || 'Erreur lors de la suppression'),
  });

  const clientOf = (booking) => clients.find(c => c.id === booking.client_id);

  const monthStart = startOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  });

  const getDayBookings = (date) => bookings.filter(b => b.date && isSameDay(parseISO(b.date), date));
  const selectedDayBookings = getDayBookings(selectedDate);
  const today = startOfDay(new Date());
  const pastUnfinished = bookings.filter(b => b.date && isBefore(parseISO(b.date), today) && b.status !== 'completed' && b.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date));

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setMobileSheetOpen(true);
  };

  const BookingCard = ({ booking }) => {
    const bookingClient = clientOf(booking);
    const clientName = bookingClient ? `${bookingClient.first_name} ${bookingClient.last_name}` : 'Client supprimé';
    const hasUrssafAI = bookingClient?.ai_status === 'ai_accepted';
    const statusColor = booking.status === 'completed' ? 'bg-green-100 text-green-800' : booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
    const statusLabel = BOOKING_STATUS_LABELS[booking.status] || booking.status;

    return (
      <Card className="border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-50">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900 text-sm">{clientName}</p>
              {bookingClient?.phone && <p className="text-xs text-slate-500">{bookingClient.phone}</p>}
            </div>
            <Badge className={`text-[10px] border-none shrink-0 ${statusColor}`}>{statusLabel}</Badge>
          </div>
          <div className="mt-2 space-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(booking.start_time) || '—'} · {formatDuration(booking.duration_minutes) || '—'}</span>
              {booking.total_price != null && <span className="ml-auto font-semibold text-slate-800">{formatPrice(booking.total_price)}</span>}
            </div>
            <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span className="truncate">{booking.address}, {booking.city}</span></div>
          </div>
        </div>

        <div className="p-3 border-b border-slate-50 space-y-2">
          <div>
            <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Intervenant</p>
            <Select
              value={booking.employee_id || 'unassigned'}
              onValueChange={(v) => updateMutation.mutate({ id: booking.id, data: { employee_id: v === 'unassigned' ? null : v, ...(v !== 'unassigned' && booking.status === 'pending' ? { status: 'confirmed' } : {}) } })}
            >
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Non assigné" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Non assigné</SelectItem>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 mb-1">Facturation</p>
            <Select value={booking.billing_status || 'none'} onValueChange={v => updateMutation.mutate({ id: booking.id, data: { billing_status: v } })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BILLING_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-3 space-y-1.5">
          {booking.status === 'confirmed' && !booking.invoice_file_path && (
            hasUrssafAI ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700 text-white gap-1.5"><FileCheck className="w-3 h-3" />Paiement URSSAF</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Déclencher le paiement URSSAF ?</AlertDialogTitle><AlertDialogDescription>Paiement URSSAF de <strong>{formatPrice(booking.total_price)}</strong> pour <strong>{clientName}</strong>.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction className="bg-green-600 hover:bg-green-700 text-white" onClick={() => payUrssaf(booking)}>Confirmer</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" disabled={chargingBookingId === booking.id}>
                    {chargingBookingId === booking.id ? <><RefreshCw className="w-3 h-3 animate-spin" />Prélèvement...</> : <><CreditCard className="w-3 h-3" />Prélever Stripe</>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Confirmer le prélèvement ?</AlertDialogTitle><AlertDialogDescription>Prélèvement de <strong>{formatPrice(booking.total_price)}</strong> sur la carte de <strong>{clientName}</strong>.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => chargeStripe(booking)}>Confirmer</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          )}

          {booking.invoice_file_path && (
            <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 text-green-700 border-green-200 hover:bg-green-50" onClick={() => openInvoice(booking)}>
              <FileText className="w-3 h-3" />Voir la facture ✓
            </Button>
          )}

          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 text-slate-600" onClick={() => setEditingBooking(booking)}>
              <Pencil className="w-3 h-3" /> Modifier
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => setRecurringBooking(booking)}>
              <Repeat className="w-3 h-3" /> Répéter
            </Button>
          </div>

          <div className="flex gap-1.5">
            {booking.status !== 'completed' && booking.status !== 'cancelled' && (
              <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50" onClick={() => updateMutation.mutate({ id: booking.id, data: { status: 'completed' } })} disabled={updateMutation.isPending}>
                <CheckCircle2 className="w-3 h-3" /> Terminer
              </Button>
            )}
            {booking.status !== 'cancelled' && booking.status !== 'completed' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"><XCircle className="w-3 h-3" />Annuler</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle><AlertDialogDescription>La réservation de <strong>{clientName}</strong> sera annulée.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Retour</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => updateMutation.mutate({ id: booking.id, data: { status: 'cancelled' } })}>Confirmer</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Supprimer ce ménage ?</AlertDialogTitle><AlertDialogDescription>Le ménage de <strong>{clientName}</strong> sera définitivement supprimé.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteMutation.mutate(booking.id)}>Supprimer</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    );
  };

  const CalendarGrid = ({ onDayClick }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
      {/* Header nav */}
      <div className="p-3 md:p-4 border-b flex items-center justify-between">
        <h2 className="text-base md:text-xl font-bold text-slate-900 capitalize flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex gap-1 md:gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center border-b bg-slate-50 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wide py-1.5 md:py-2">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d}>{d}</div>)}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dayBookings = getDayBookings(day);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toString()}
              onClick={() => onDayClick(day)}
              className={`border-b border-r min-h-[52px] md:min-h-[80px] p-1 md:p-1.5 cursor-pointer transition-colors relative ${!isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'bg-white'} ${isSelected ? 'ring-2 ring-inset ring-green-500 z-10' : 'hover:bg-slate-50'}`}
            >
              <div className={`text-xs md:text-sm font-medium w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full mb-0.5 md:mb-1 ${isToday ? 'bg-green-600 text-white' : ''}`}>
                {format(day, 'd')}
              </div>
              {/* Mobile: just dots */}
              <div className="flex md:hidden gap-0.5 flex-wrap mt-0.5">
                {dayBookings.slice(0, 3).map(b => (
                  <div key={b.id} className={`w-1.5 h-1.5 rounded-full ${b.status === 'completed' ? 'bg-green-500' : b.status === 'confirmed' ? 'bg-blue-500' : b.status === 'cancelled' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                ))}
                {dayBookings.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
              </div>
              {/* Desktop: text labels */}
              <div className="hidden md:block space-y-0.5">
                {dayBookings.slice(0, 3).map(booking => (
                  <div key={booking.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${booking.status === 'completed' ? 'bg-green-100 text-green-800' : booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {formatTime(booking.start_time)} {clientOf(booking)?.last_name || 'Client'}
                  </div>
                ))}
                {dayBookings.length > 3 && <div className="text-[10px] text-slate-400 pl-1">+{dayBookings.length - 3}</div>}
              </div>
              {/* Mobile: count badge */}
              {dayBookings.length > 0 && (
                <div className="md:hidden absolute top-0.5 right-0.5 text-[9px] text-slate-400 font-medium">
                  {dayBookings.length}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const DayPanel = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base capitalize text-slate-900">{format(selectedDate, 'EEEE d MMMM', { locale: fr })}</h3>
          <p className="text-xs text-slate-500">{selectedDayBookings.length} intervention{selectedDayBookings.length > 1 ? 's' : ''}</p>
        </div>
      </div>
      {selectedDayBookings.length === 0 ? (
        <div className="text-center py-10 text-slate-400 italic text-sm">Aucune intervention ce jour-là</div>
      ) : (
        selectedDayBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)
      )}
    </div>
  );

  return (
    <AdminLayout>
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Button
          variant={showPastUnfinished ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowPastUnfinished(v => !v)}
          className={showPastUnfinished ? 'bg-orange-500 hover:bg-orange-600 text-white text-xs' : 'text-orange-600 border-orange-300 hover:bg-orange-50 text-xs'}
        >
          <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
          Non terminés
          {pastUnfinished.length > 0 && (
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${showPastUnfinished ? 'bg-white text-orange-500' : 'bg-orange-500 text-white'}`}>
              {pastUnfinished.length}
            </span>
          )}
        </Button>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#E95678] hover:bg-[#d44565] text-white gap-1.5 ml-auto text-xs">
              <Plus className="w-3.5 h-3.5" /> Nouveau ménage
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nouveau ménage</DialogTitle></DialogHeader>
            <BookingCreateForm employees={employees} clients={clients} onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {showPastUnfinished && (
        <div className="mb-4 bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-orange-50 border-b border-orange-100">
            <p className="text-sm font-semibold text-orange-800">{pastUnfinished.length} ménage{pastUnfinished.length > 1 ? 's' : ''} non terminé{pastUnfinished.length > 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {pastUnfinished.map(booking => {
              const c = clientOf(booking);
              return (
              <div key={booking.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-slate-800">{format(parseISO(booking.date), 'dd/MM/yyyy', { locale: fr })} {booking.start_time && `à ${formatTime(booking.start_time)}`}</span>
                  <span className="text-slate-500 text-xs ml-2 truncate">{c ? `${c.first_name} ${c.last_name}` : 'Client supprimé'} — {booking.city}</span>
                </div>
                <Button size="sm" variant="outline" className="text-xs text-green-700 border-green-200 hover:bg-green-50 shrink-0" onClick={() => updateMutation.mutate({ id: booking.id, data: { status: 'completed' } })} disabled={updateMutation.isPending}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Terminer
                </Button>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* MOBILE: Calendar full width + bottom sheet */}
      <div className="block lg:hidden">
        <CalendarGrid onDayClick={handleDayClick} />

        {/* Bottom sticky bar showing selected day summary */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between shadow-lg z-40 cursor-pointer"
          onClick={() => setMobileSheetOpen(true)}
        >
          <div>
            <p className="text-sm font-semibold text-slate-900 capitalize">{format(selectedDate, 'EEEE d MMMM', { locale: fr })}</p>
            <p className="text-xs text-slate-500">{selectedDayBookings.length} intervention{selectedDayBookings.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedDayBookings.length > 0 && (
              <div className="flex gap-1">
                {['completed', 'confirmed', 'pending', 'cancelled'].map(status => {
                  const count = selectedDayBookings.filter(b => b.status === status).length;
                  if (!count) return null;
                  const colors = { completed: 'bg-green-500', confirmed: 'bg-blue-500', pending: 'bg-yellow-400', cancelled: 'bg-red-400' };
                  return <span key={status} className={`${colors[status]} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>{count}</span>;
                })}
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400 rotate-[-90deg]" />
          </div>
        </div>

        {/* Mobile bottom sheet */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
            <SheetHeader className="pb-2 border-b mb-3">
              <SheetTitle className="capitalize text-left">{format(selectedDate, 'EEEE d MMMM', { locale: fr })}</SheetTitle>
            </SheetHeader>
            <DayPanel />
          </SheetContent>
        </Sheet>
      </div>

      {/* DESKTOP: Side by side */}
      <div className="hidden lg:flex gap-6 h-[calc(100vh-180px)]">
        <div className="flex-1 flex flex-col min-h-0">
          <CalendarGrid onDayClick={(day) => setSelectedDate(day)} />
        </div>
        <div className="w-96 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-0">
          <div className="p-4 border-b bg-slate-50 shrink-0">
            <h3 className="font-bold text-lg capitalize text-slate-900">{format(selectedDate, 'EEEE d MMMM', { locale: fr })}</h3>
            <p className="text-sm text-slate-500">{selectedDayBookings.length} intervention{selectedDayBookings.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {selectedDayBookings.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic text-sm">Aucune intervention ce jour-là</div>
            ) : (
              selectedDayBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)
            )}
          </div>
        </div>
      </div>

      {/* Extra bottom padding on mobile for the sticky bar */}
      <div className="h-20 lg:hidden" />

      <RecurringBookingDialog
        booking={recurringBooking}
        client={recurringBooking ? clientOf(recurringBooking) : null}
        open={!!recurringBooking}
        onClose={() => setRecurringBooking(null)}
      />
      {editingBooking && <EditBookingDialog booking={editingBooking} open={!!editingBooking} onClose={() => setEditingBooking(null)} />}
    </AdminLayout>
  );
}
