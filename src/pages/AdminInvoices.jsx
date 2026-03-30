import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmployeeInvoiceGenerator from '@/components/admin/EmployeeInvoiceGenerator';
import ClientInvoicesTab from '@/components/admin/ClientInvoicesTab';

export default function AdminInvoices() {
  const [activeTab, setActiveTab] = useState('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now));
  const [selectedYear, setSelectedYear] = useState(getYear(now));
  const [selectedEmp, setSelectedEmp] = useState(null);

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list(),
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // Récap heures par employée pour le mois sélectionné
  const hoursRecap = employees.map(emp => {
    const completedBookings = bookings.filter(b =>
      b.employee_id === emp.id &&
      b.status === 'completed' &&
      b.date &&
      getMonth(parseISO(b.date)) === selectedMonth &&
      getYear(parseISO(b.date)) === selectedYear
    );
    const totalHours = completedBookings.reduce((sum, b) => {
      const match = b.duration?.match(/^(\d+)h(\d+)?/);
      if (match) return sum + parseInt(match[1], 10) + (match[2] ? parseInt(match[2], 10) / 60 : 0);
      const numMatch = b.duration?.match(/(\d+(?:[.,]\d+)?)/);
      return sum + (numMatch ? parseFloat(numMatch[1].replace(',', '.')) : 0);
    }, 0);
    const totalCost = emp.hourly_rate ? totalHours * emp.hourly_rate : null;
    const existingInvoice = invoices.find(inv =>
      inv.employee_id === emp.id &&
      inv.period_start &&
      getMonth(parseISO(inv.period_start)) === selectedMonth &&
      getYear(parseISO(inv.period_start)) === selectedYear
    );
    return { emp, count: completedBookings.length, totalHours, totalCost, existingInvoice };
  });

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : '—';
  };

  const filteredInvoices = invoices
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
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Factures</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
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

        {activeTab === 'clients' && <ClientInvoicesTab />}

        {activeTab === 'employees' && <>
        {/* Total du mois employées */}
        {(() => {
          const totalHours = hoursRecap.reduce((s, r) => s + r.totalHours, 0);
          const totalCost = hoursRecap.reduce((s, r) => s + (r.totalCost || 0), 0);
          const hasCost = hoursRecap.some(r => r.totalCost !== null);
          return (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Total heures du mois</p>
                <p className="text-2xl font-bold text-green-800">{totalHours.toFixed(1)} h</p>
              </div>
              {hasCost && (
                <div>
                  <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Total à payer aux employées</p>
                  <p className="text-2xl font-bold text-green-800">{totalCost.toFixed(2)} €</p>
                </div>
              )}
              <div>
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Mois</p>
                <p className="text-sm font-semibold text-green-800 capitalize">{format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy', { locale: fr })}</p>
              </div>
            </div>
          );
        })()}
        {/* Récap heures par employée — cliquable pour générer facture */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              Récapitulatif mensuel par employée
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700 capitalize min-w-[120px] text-center">
                {format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy', { locale: fr })}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {employees.map(emp => {
              const recap = hoursRecap.find(r => r.emp.id === emp.id) || { count: 0, totalHours: 0, totalCost: null, existingInvoice: null };
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmp(emp.id)}
                  className="flex items-center justify-between bg-slate-50 hover:bg-[#E95678]/5 border border-transparent hover:border-[#E95678]/20 rounded-lg px-4 py-3 transition-all text-left w-full group"
                >
                  <div>
                    <p className="font-medium text-slate-800 text-sm group-hover:text-[#E95678]">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-slate-400">{recap.count} ménage{recap.count !== 1 ? 's' : ''} terminé{recap.count !== 1 ? 's' : ''}</p>
                    {recap.existingInvoice && (
                      <Badge className="mt-1 text-xs bg-green-100 text-green-700 border-none">
                        Facture générée
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">{recap.totalHours.toFixed(1)}h</p>
                    {recap.totalCost !== null && (
                      <p className="text-xs text-green-700 font-medium">{recap.totalCost.toFixed(2)} €</p>
                    )}
                    {emp.hourly_rate == null && (
                      <p className="text-xs text-slate-400 italic">taux non défini</p>
                    )}
                    <p className="text-xs text-[#E95678] opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1 justify-end">
                      <FileText className="w-3 h-3" /> Générer
                    </p>
                  </div>
                </button>
              );
            })}
            {employees.length === 0 && (
              <p className="text-sm text-slate-400 col-span-3">Aucune employée trouvée</p>
            )}
          </div>
        </div>

        {/* Liste des factures */}
        <div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm mb-4">
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

          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#E95678]/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-[#E95678]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{invoice.number}</h3>
                      <Badge className={`border-none text-xs ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                        {invoice.status === 'paid' ? 'Payée' : invoice.status === 'pending' ? 'En attente' : 'Brouillon'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">{getEmployeeName(invoice.employee_id)}</span>
                      {invoice.period_start && invoice.period_end && (
                        <span className="text-slate-400 ml-2">
                          · {format(parseISO(invoice.period_start), 'dd/MM/yyyy')} – {format(parseISO(invoice.period_end), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      Émise le {invoice.date ? format(parseISO(invoice.date), 'dd MMM yyyy', { locale: fr }) : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <p className="font-bold text-lg text-slate-900">{invoice.amount?.toFixed(2)} €</p>
                  <div className="flex items-center gap-1">
                    {invoice.file_url && (
                      <a href={invoice.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1 text-blue-600 hover:bg-blue-50">
                          <Eye className="w-4 h-4" /> Voir
                        </Button>
                      </a>
                    )}
                    {invoice.file_url && (
                      <a href={invoice.file_url} download>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
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
              </div>
            ))}
            {filteredInvoices.length === 0 && (
              <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed">
                Aucune facture trouvée
              </div>
            )}
          </div>
        </div>
        </>}
      </div>

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