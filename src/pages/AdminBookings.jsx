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
  Clock, 
  MapPin, 
  User, 
  Search, 
  Plus,
  CreditCard,
  FileCheck,
  Home,
  RefreshCw,
  XCircle,
  ExternalLink,
  Upload,
  FileText,
  Pencil,
  Trash2
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
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const SERVICE_LABELS = {
  regular: 'Régulier',
  one_time: 'Ponctuel',
  spring: 'Grand ménage',
  enterprise: 'Entreprise'
};

const URSSAF_COLORS = {
  none: 'bg-slate-100 text-slate-500',
  pending: 'bg-yellow-100 text-yellow-800',
  requested: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  refused: 'bg-red-100 text-red-800'
};

// Couleurs pour le statut AI (urssaf_status sur le client)
const AI_STATUS_COLORS = {
  completed: 'bg-blue-100 text-blue-800',
  ai_requested: 'bg-yellow-100 text-yellow-800',
  ai_accepted: 'bg-green-100 text-green-800',
  ai_refused: 'bg-red-100 text-red-800',
};

const AI_STATUS_LABELS = {
  completed: 'URSSAF : Complété — Faire la demande d\'AI',
  ai_requested: 'URSSAF : AI Demandée',
  ai_accepted: 'URSSAF : AI Acceptée',
  ai_refused: 'URSSAF : AI Refusée',
};

const URSSAF_CLIENT_LABELS = {
  none: '—',
  pending: 'En attente',
  requested: 'Demandé',
  accepted: 'Accepté',
  refused: 'Refusé'
};

const BILLING_LABELS = {
  none: '—',
  avance_immediate: 'Finaliser le brouillon',
  generated: 'Générée',
  paid: 'Réglée'
};

const BILLING_COLORS = {
  none: 'bg-slate-100 text-slate-500',
  avance_immediate: 'bg-blue-100 text-blue-800',
  generated: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800'
};

export default function AdminBookings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [chargingBookingId, setChargingBookingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  
  const queryClient = useQueryClient();

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Booking.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Ménage supprimé');
    },
  });

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.contact_details?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.contact_details?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? booking.status !== 'completed' && booking.status !== 'cancelled' : booking.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (booking, newStatus) => {
    updateMutation.mutate({ id: booking.id, data: { status: newStatus } });
  };

  const handleAssignEmployee = (booking, employeeId) => {
    updateMutation.mutate({ id: booking.id, data: { employee_id: employeeId === 'unassigned' ? null : employeeId } });
  };

  const handleUrssafChange = (booking, urssafStatus) => {
    // When URSSAF status changes to accepted/refused, update booking payment method accordingly
    const extra = urssafStatus === 'accepted' ? { payment_method: 'urssaf' } 
                : urssafStatus === 'refused' ? { payment_method: 'stripe' } 
                : {};
    updateMutation.mutate({ id: booking.id, data: { urssaf_status: urssafStatus, ...extra } });
  };

  const handleCancelBooking = (booking) => {
    updateMutation.mutate({ id: booking.id, data: { status: 'cancelled' } });
  };

  const parseDurationToHours = (duration) => {
    if (!duration) return null;
    // Handle formats: "3h", "2h30", "2.5h", "2h30min"
    const match = duration.match(/^(\d+)h(\d+)?/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    return hours + minutes / 60;
  };

  const getBasePrice = (serviceType) => {
    if (serviceType === 'regular') return 26;
    if (serviceType === 'one_time') return 29;
    if (serviceType === 'spring') return 32;
    return 0;
  };

  const parseTimeToNumber = (time) => {
    if (!time) return null;
    // "9h" → 9, "3h30" → 3.5, "14h" → 14
    const match = time.match(/^(\d+)h(\d+)?/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    return hours + minutes / 60;
  };

  const buildWebhookPayload = (booking, paymentType) => {
    const client = clients.find(c => c.id === booking.client_id);
    const employee = employees.find(e => e.id === booking.employee_id);
    const durationHours = parseDurationToHours(booking.duration);
    const basePrice = getBasePrice(booking.service_type);
    const basePriceTotalCentimes = durationHours !== null ? Math.round(basePrice * durationHours * 100) : null;
    return {
      payment_type: paymentType,
      booking: {
        id: booking.id,
        date: booking.date,
        time: parseTimeToNumber(booking.time),
        duration: durationHours,
        address: booking.address,
        zipcode: booking.zipcode,
        city: booking.city,
        service_type: booking.service_type,
        recurrence: booking.recurrence,
        base_price_per_hour: basePrice,
        base_price_total: basePriceTotalCentimes,
        total_price: booking.total_price,
        status: booking.status,
        urssaf_status: booking.urssaf_status || 'none',
        payment_method: paymentType,
        instructions: booking.instructions,
        has_animals: booking.has_animals,
        has_cleaning_supplies: booking.has_cleaning_supplies,
      },
      client: {
        id: booking.client_id,
        idAbby: client?.idAbby || '',
        first_name: booking.contact_details?.first_name || client?.first_name || '',
        last_name: booking.contact_details?.last_name || client?.last_name || '',
        email: booking.contact_details?.email || client?.email || '',
        phone: booking.contact_details?.phone || client?.phone || '',
        address: client?.address || '',
        zipcode: client?.zipcode || '',
        city: client?.city || '',
        iban: client?.iban || '',
        bic: client?.bic || '',
        account_holder: client?.account_holder || '',
        stripe_payment_method_id: client?.stripe_payment_method_id || '',
        stripe_customer_id: client?.stripe_customer_id || '',
        urssaf_completed: client?.urssaf_completed || false,
      },
      employee: employee ? {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
      } : null,
    };
  };

  // Envoie le webhook, récupère idFacture + factureFile, upload le PDF, crée une Invoice, met à jour le booking
  const triggerWebhookAndSaveInvoice = async (booking, paymentType) => {
    const res = await fetch('https://hook.eu1.make.com/1gppqnhdkde7spo5at3z87vey1tr72wm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildWebhookPayload(booking, paymentType)),
    });
    const json = await res.json().catch(() => ({}));
    const invoiceId = json?.idFacture || null;
    let invoiceFileUrl = null;

    if (json?.factureFile) {
      const base64 = typeof json.factureFile === 'string'
        ? json.factureFile
        : btoa(String.fromCharCode(...new Uint8Array(json.factureFile)));
      const byteChars = atob(base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      const pdfFile = new File([byteArray], `facture-${booking.id}.pdf`, { type: 'application/pdf' });
      const uploadFile = base44.integrations?.Core?.UploadFile;
      if (uploadFile) {
        const { file_url } = await uploadFile({ file: pdfFile });
        invoiceFileUrl = file_url;
      } else {
        console.warn('Invoice PDF generated but no upload integration is configured yet.');
      }
    }

    // Mettre à jour le booking
    const bookingUpdates = { billing_status: 'generated' };
    if (invoiceId) bookingUpdates.invoice_id = invoiceId;
    if (invoiceFileUrl) bookingUpdates.invoice_file_url = invoiceFileUrl;
    await base44.entities.Booking.update(booking.id, bookingUpdates);

    // Créer une entrée dans la table Invoice
    await base44.entities.Invoice.create({
      number: invoiceId || `INV-${booking.id.slice(0, 8)}`,
      amount: booking.total_price,
      date: new Date().toISOString().split('T')[0],
      status: 'paid',
      file_url: invoiceFileUrl || '',
    });

    return { invoiceId, invoiceFileUrl };
  };

  const handleChargeStripe = async (booking) => {
    setChargingBookingId(booking.id);
    try {
      // 1) Prélèvement Stripe
      const response = await base44.functions.invoke('chargeClient', { bookingId: booking.id });
      if (!response.data?.success) {
        toast.error(response.data?.error || 'Erreur lors du prélèvement');
        return;
      }
      // 2) Webhook + sauvegarde facture
      await triggerWebhookAndSaveInvoice(booking, 'stripe');
      toast.success(`Paiement de ${booking.total_price}€ effectué avec succès`);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (err) {
      toast.error(err.message || 'Erreur lors du prélèvement');
    } finally {
      setChargingBookingId(null);
    }
  };

  const handlePaymentUrssaf = async (booking) => {
    try {
      const res = await fetch('https://hook.eu1.make.com/1gppqnhdkde7spo5at3z87vey1tr72wm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildWebhookPayload(booking, 'urssaf')),
      });
      const json = await res.json().catch(() => ({}));
      const invoiceId = json?.idFacture || null;
      const updates = { billing_status: 'avance_immediate' };
      if (invoiceId) updates.invoice_id = invoiceId;
      await base44.entities.Booking.update(booking.id, updates);
      
      // Créer une entrée Invoice (sans file_url)
      await base44.entities.Invoice.create({
        number: invoiceId || `INV-${booking.id.slice(0, 8)}`,
        amount: booking.total_price,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        file_url: '',
      });
      
      toast.success('Demande de paiement URSSAF envoyée');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    } catch (err) {
      toast.error('Erreur lors du paiement URSSAF');
    }
  };

  const handleAssignEmployeeAndConfirm = (booking, employeeId) => {
    const data = { employee_id: employeeId === 'unassigned' ? null : employeeId };
    // Auto-confirm when employee is assigned
    if (employeeId !== 'unassigned') {
      data.status = 'confirmed';
    }
    updateMutation.mutate({ id: booking.id, data });
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

        {/* Bookings list */}
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const bookingClient = clients.find(c => c.id === booking.client_id);
            const aiStatus = bookingClient?.urssaf_completed
              ? (bookingClient.urssaf_status && bookingClient.urssaf_status !== 'none' ? bookingClient.urssaf_status : 'completed')
              : null;
            const borderColor = aiStatus === 'ai_accepted' ? 'border-l-4 border-l-green-400'
              : aiStatus === 'ai_requested' ? 'border-l-4 border-l-yellow-400'
              : aiStatus === 'ai_refused' ? 'border-l-4 border-l-red-400'
              : aiStatus === 'completed' ? 'border-l-4 border-l-blue-400'
              : '';
            return (
            <div key={booking.id} className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 ${borderColor}`}>
              
              {/* Header row */}
              <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-50">
                <h3 className="font-bold text-slate-900 flex-1 flex flex-wrap items-center gap-2">
                  <span>
                    {booking.contact_details?.first_name} {booking.contact_details?.last_name}
                    {booking.contact_details?.phone && (
                      <span className="text-sm font-normal text-slate-500 ml-2">· {booking.contact_details.phone}</span>
                    )}
                    {booking.contact_details?.email && (
                      <span className="text-sm font-normal text-slate-400 ml-2">· {booking.contact_details.email}</span>
                    )}
                  </span>
                  {(() => {
                    const client = clients.find(c => c.id === booking.client_id);
                    if (!client) return null;
                    const aiStatus = client.urssaf_completed ? (client.urssaf_status && client.urssaf_status !== 'none' ? client.urssaf_status : 'completed') : null;
                    if (!aiStatus) return null;
                    return (
                      <Badge className={`border-none text-xs font-normal ${AI_STATUS_COLORS[aiStatus] || 'bg-slate-100 text-slate-500'}`}>
                        {AI_STATUS_LABELS[aiStatus] || aiStatus}
                      </Badge>
                    );
                  })()}
                </h3>

                <Badge className={`border-none text-xs ${
                  booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {booking.status === 'completed' ? 'Terminé' : 
                   booking.status === 'confirmed' ? 'Confirmé' : 
                   booking.status === 'cancelled' ? 'Annulé' : 'En attente'}
                </Badge>

                <Badge className={`border-none text-xs ${BILLING_COLORS[booking.billing_status || 'none']}`}>
                  Facture : {BILLING_LABELS[booking.billing_status || 'none']}
                </Badge>

                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700" onClick={() => setEditingBooking(booking)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce ménage ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le ménage de <strong>{booking.contact_details?.first_name} {booking.contact_details?.last_name}</strong> sera définitivement supprimé.
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

              {/* Details grid */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Address & Service */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p>{booking.address}</p>
                      {booking.additional_address && <p className="text-slate-400 text-xs">{booking.additional_address}</p>}
                      <p>{booking.zipcode} {booking.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Home className="w-4 h-4 text-slate-400" />
                    <Badge variant="outline" className="text-xs font-medium">
                      {SERVICE_LABELS[booking.service_type] || booking.service_type}
                    </Badge>
                    {booking.recurrence && booking.recurrence !== 'none' && (
                      <Badge variant="outline" className="text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {booking.recurrence === 'weekly' ? 'Hebdo' : booking.recurrence === 'biweekly' ? 'Bi-mens.' : 'Mensuel'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-medium text-sm">
                    <CalendarIcon className="w-4 h-4 text-green-600" />
                    <span>{booking.date ? format(parseISO(booking.date), 'd MMM yyyy', { locale: fr }) : 'Date non définie'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{booking.time || '—'} · {booking.duration || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span>Créé le {booking.created_date ? format(parseISO(booking.created_date), 'd MMM yyyy', { locale: fr }) : '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {booking.hours != null && (
                      <span className="text-xs text-slate-500">{booking.hours}h</span>
                    )}
                    {booking.hourly_rate != null && (
                      <span className="text-xs text-slate-500">{booking.hourly_rate} €/h</span>
                    )}
                    {booking.total_price != null && (
                      <p className="text-sm font-semibold text-slate-900">{booking.total_price} €</p>
                    )}
                  </div>
                </div>

                {/* Employee & URSSAF */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Intervenant</p>
                    <Select 
                      value={booking.employee_id || "unassigned"} 
                      onValueChange={(value) => handleAssignEmployeeAndConfirm(booking, value)}
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
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="avance_immediate">Finaliser le brouillon</SelectItem>
                        <SelectItem value="generated">Générée</SelectItem>
                        <SelectItem value="paid">Réglée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Payment + Cancel */}
                <div className="space-y-2 flex flex-col justify-center">
                  <p className="text-xs text-slate-400">Paiement</p>
                  {booking.status === 'cancelled' ? (
                    <p className="text-xs text-red-400 italic">Ménage annulé</p>
                  ) : booking.status !== 'confirmed' ? (
                    <p className="text-xs text-slate-400 italic">Disponible une fois confirmé</p>
                  ) : booking.invoice_file_url ? (
                    // Facture générée → téléchargement
                    <a href={booking.invoice_file_url} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button size="sm" variant="outline" className="gap-2 w-full text-green-700 border-green-200 hover:bg-green-50">
                        <FileText className="w-4 h-4" />
                        Voir la facture ✓
                      </Button>
                    </a>
                  ) : (() => { const c = clients.find(cl => cl.id === booking.client_id); return c?.urssaf_status === 'ai_accepted'; })() ? (
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
                            Vous allez déclencher le paiement URSSAF pour <strong>{booking.contact_details?.first_name} {booking.contact_details?.last_name}</strong> d'un montant de <strong>{booking.total_price}€</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handlePaymentUrssaf(booking)}
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
                            Vous allez prélever <strong>{booking.total_price}€</strong> sur la carte de <strong>{booking.contact_details?.first_name} {booking.contact_details?.last_name}</strong>. Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-slate-900 hover:bg-slate-800 text-white"
                            onClick={() => handleChargeStripe(booking)}
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
                            Cette action va annuler la réservation de <strong>{booking.contact_details?.first_name} {booking.contact_details?.last_name}</strong> prévue le {booking.date ? format(parseISO(booking.date), 'd MMM yyyy', { locale: fr }) : '—'} à {booking.time}. Cette action est irréversible.
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
                </div>
              </div>

              {/* Instructions */}
              {booking.instructions && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-slate-400 bg-slate-50 rounded px-3 py-2 italic">
                    📝 {booking.instructions}
                  </p>
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
