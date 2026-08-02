import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Search,
  Eye,
  Download,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import InvoiceCreateDialog from '@/components/admin/InvoiceCreateDialog';
import { Invoices, Employees, Bookings, Clients } from '@/api/db';
import { getSignedUrl, BUCKETS } from '@/api/storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { durationToHours, formatDuration } from '@/lib/format';
import EmployeeInvoiceGenerator from '@/components/admin/EmployeeInvoiceGenerator';
import ClientInvoicesTab from '@/components/admin/ClientInvoicesTab';

const STATUS_BADGE = {
  paid: { label: 'Payée', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
};

function InvoiceStatusBadge({ status }) {
  const s = STATUS_BADGE[status] || { label: 'Brouillon', className: 'bg-slate-100 text-slate-500 hover:bg-slate-100' };
  return <Badge className={`border-none text-xs shrink-0 ${s.className}`}>{s.label}</Badge>;
}

export default function AdminInvoices() {
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now));
  const [selectedYear, setSelectedYear] = useState(getYear(now));
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => Invoices.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => Employees.list(),
    initialData: [],
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => Bookings.list(),
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => Clients.list(),
    initialData: [],
  });

  // L'onglet employées ne montre QUE les factures type 'employee'
  const employeeInvoices = invoices.filter(inv => inv.type === 'employee');

  const deleteMutation = useMutation({
    mutationFn: (id) => Invoices.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Facture supprimée');
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

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const monthLabel = format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy', { locale: fr });

  // Récap heures par employée pour le mois sélectionné
  const hoursRecap = employees.map(emp => {
    const completedBookings = bookings.filter(b =>
      b.employee_id === emp.id &&
      b.status === 'completed' &&
      b.date &&
      getMonth(parseISO(b.date)) === selectedMonth &&
      getYear(parseISO(b.date)) === selectedYear
    );
    const totalHours = completedBookings.reduce((sum, b) => sum + durationToHours(b.duration_minutes), 0);
    const totalCost = emp.hourly_rate != null ? totalHours * emp.hourly_rate : null;
    const existingInvoice = employeeInvoices.find(inv =>
      inv.employee_id === emp.id &&
      inv.period_start &&
      getMonth(parseISO(inv.period_start)) === selectedMonth &&
      getYear(parseISO(inv.period_start)) === selectedYear
    );
    return { emp, count: completedBookings.length, totalHours, totalCost, existingInvoice };
  });

  const activeRecap = hoursRecap.filter(r => r.count > 0);
  const inactiveRecap = hoursRecap.filter(r => r.count === 0);
  const visibleRecap = showInactive ? [...activeRecap, ...inactiveRecap] : activeRecap;

  const totalHoursMonth = hoursRecap.reduce((s, r) => s + r.totalHours, 0);
  const totalCostMonth = hoursRecap.reduce((s, r) => s + (r.totalCost || 0), 0);
  const hasCost = hoursRecap.some(r => r.totalCost !== null);

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : '—';
  };

  const filteredInvoices = employeeInvoices
    .filter(inv =>
      inv.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getEmployeeName(inv.employee_id).toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const selectedEmpData = selectedEmp ? employees.find(e => e.id === selectedEmp) : null;
  const selectedRecap = selectedEmp ? hoursRecap.find(r => r.emp.id === selectedEmp) : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-slate-900">Factures</h1>
          <Button className="bg-[#E95678] hover:bg-[#d44565] text-white gap-2" onClick={() => setCreateInvoiceOpen(true)}>
            <Plus className="w-4 h-4" /> Nouvelle facture
          </Button>
        </div>

        {/* Onglets + sélecteur de mois unique (pilote les deux onglets) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'employees'
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Factures employées
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'clients'
                  ? 'border-[#E95678] text-[#E95678]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Factures clients
            </button>
          </div>
          <div className="flex items-center gap-1 pb-2 self-end sm:self-auto">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth} aria-label="Mois précédent">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-slate-800 capitalize min-w-[130px] text-center">
              {monthLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth} aria-label="Mois suivant">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {activeTab === 'clients' && (
          <ClientInvoicesTab month={selectedMonth} year={selectedYear} />
        )}

        {activeTab === 'employees' && <>
        {/* KPIs du mois */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-5 py-4 flex flex-wrap gap-x-10 gap-y-3 items-center">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total heures du mois</p>
            <p className="text-2xl font-bold text-slate-900">{formatDuration(Math.round(totalHoursMonth * 60))}</p>
          </div>
          {hasCost && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total à payer aux employées</p>
              <p className="text-2xl font-bold text-green-700">{totalCostMonth.toFixed(2)} €</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Mois</p>
            <p className="text-sm font-semibold text-slate-700 capitalize">{monthLabel}</p>
          </div>
        </div>

        {/* Récapitulatif du mois par employée */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              Récapitulatif du mois
            </h2>
            <p className="text-sm text-slate-500">
              {activeRecap.length} employée{activeRecap.length > 1 ? 's' : ''} avec activité
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {employees.length === 0 && (
              <p className="p-8 text-center text-slate-500">Aucune employée trouvée</p>
            )}
            {employees.length > 0 && visibleRecap.length === 0 && (
              <p className="p-8 text-center text-slate-500">Aucun ménage terminé ce mois-ci</p>
            )}
            {visibleRecap.map(({ emp, count, totalHours, totalCost, existingInvoice }) => (
              <div
                key={emp.id}
                className={`flex items-center gap-3 md:gap-4 px-4 py-3 ${count === 0 ? 'opacity-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{emp.first_name} {emp.last_name}</p>
                  <p className="text-xs text-slate-500">
                    {count} ménage{count !== 1 ? 's' : ''} terminé{count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="hidden sm:block w-20 text-right shrink-0">
                  <p className="text-sm font-medium text-slate-700">{formatDuration(Math.round(totalHours * 60))}</p>
                </div>
                <div className="w-28 text-right shrink-0">
                  {totalCost !== null ? (
                    <p className="text-sm font-semibold text-slate-900">{totalCost.toFixed(2)} €</p>
                  ) : (
                    <p className="text-xs text-orange-500">Taux non défini</p>
                  )}
                </div>
                {existingInvoice && (
                  <Badge className="hidden md:inline-flex bg-green-100 text-green-700 border-none hover:bg-green-100 shrink-0">
                    Facture générée
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 shrink-0"
                  onClick={() => setSelectedEmp(emp.id)}
                  disabled={emp.hourly_rate == null}
                  title={emp.hourly_rate == null ? 'Définissez le taux horaire de cette employée pour générer une facture' : undefined}
                >
                  <FileText className="w-3.5 h-3.5" /> Générer
                </Button>
              </div>
            ))}
          </div>
          {inactiveRecap.length > 0 && (
            <button
              onClick={() => setShowInactive(v => !v)}
              className="mt-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              {showInactive ? 'Masquer' : 'Afficher'} les employées sans activité ({inactiveRecap.length})
            </button>
          )}
        </div>

        {/* Historique des factures */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600" />
              Historique des factures
            </h2>
            <p className="text-sm text-slate-500">
              {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm border border-slate-100 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Rechercher par numéro ou employée..."
                className="pl-10 border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {filteredInvoices.length === 0 && (
              <p className="p-8 text-center text-slate-500">
                {searchQuery ? 'Aucune facture trouvée' : 'Aucune facture enregistrée'}
              </p>
            )}
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center gap-3 md:gap-4 px-4 py-3">
                <div className="w-9 h-9 bg-green-50 rounded-lg hidden sm:flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm">{invoice.number}</p>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {getEmployeeName(invoice.employee_id)}
                    {invoice.period_start && invoice.period_end && (
                      <span className="text-slate-400">
                        {' '}· {format(parseISO(invoice.period_start), 'dd/MM/yyyy')} – {format(parseISO(invoice.period_end), 'dd/MM/yyyy')}
                      </span>
                    )}
                    {invoice.date && (
                      <span className="text-slate-400"> · émise le {format(parseISO(invoice.date), 'dd MMM yyyy', { locale: fr })}</span>
                    )}
                  </p>
                </div>
                <p className="font-semibold text-slate-900 text-sm shrink-0">{Number(invoice.amount || 0).toFixed(2)} €</p>
                <div className="flex items-center gap-1 shrink-0">
                  {invoice.file_path && (
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-blue-600 hover:bg-blue-50" onClick={() => openInvoiceFile(invoice)}>
                      <Eye className="w-3.5 h-3.5" /> Voir
                    </Button>
                  )}
                  {invoice.file_path && (
                    <Button variant="outline" size="sm" className="h-8" onClick={() => openInvoiceFile(invoice, true)} title="Télécharger">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-red-500 hover:bg-red-50 hover:text-red-600" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          La facture <strong>{invoice.number}</strong> sera définitivement supprimée. Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => deleteMutation.mutate(invoice.id)}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>}
      </div>

      {/* Création manuelle de facture (B2C / B2B) */}
      <InvoiceCreateDialog
        open={createInvoiceOpen}
        onClose={() => setCreateInvoiceOpen(false)}
        clients={clients}
        invoices={invoices}
      />

      {/* Modale génération facture */}
      {selectedEmpData && (
        <EmployeeInvoiceGenerator
          open={!!selectedEmp}
          emp={selectedEmpData}
          bookings={bookings}
          clients={clients}
          month={selectedMonth}
          year={selectedYear}
          existingInvoice={selectedRecap?.existingInvoice}
          onClose={() => setSelectedEmp(null)}
        />
      )}
    </AdminLayout>
  );
}
