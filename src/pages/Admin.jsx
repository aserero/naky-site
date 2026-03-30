import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  Users, 
  ClipboardList, 
  Clock, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminDashboard() {
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list(),
    initialData: [],
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  // Calculate stats
  const today = new Date();

  // Alerts
  const unpaidCompletedBookings = bookings.filter(
    b => b.status === 'completed' && b.billing_status !== 'paid'
  );
  const refusedUrssafClients = clients.filter(c => c.urssaf_completed === false && 
    bookings.some(b => b.client_id === c.id && b.urssaf_status === 'refused')
  );

  // Clients dont l'URSSAF est complété mais l'AI n'a pas encore été demandée
  const pendingAiClients = clients.filter(c => 
    c.urssaf_completed && (!c.urssaf_status || c.urssaf_status === 'none' || c.urssaf_status === 'completed')
  );
  const todayBookings = bookings.filter(b => b.date && isToday(parseISO(b.date)));
  
  const activeEmployees = employees.filter(e => e.status === 'active');
  
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekBookings = bookings.filter(b => 
    b.date && isWithinInterval(parseISO(b.date), { start: weekStart, end: weekEnd })
  );

  const totalHours = weekBookings.reduce((acc, curr) => {
    const duration = parseFloat(curr.duration?.replace('h', '.') || 0);
    return acc + duration;
  }, 0);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500 capitalize">
            {format(today, 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>

        {/* Alert Banners */}
        {unpaidCompletedBookings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-red-800">Ménages terminés non réglés ({unpaidCompletedBookings.length})</h3>
            </div>
            <div className="space-y-2">
              {unpaidCompletedBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-red-100">
                  <span className="font-medium text-slate-800">{b.contact_details?.first_name} {b.contact_details?.last_name}</span>
                  <span className="text-slate-500">{b.date ? format(parseISO(b.date), 'd MMM yyyy', { locale: fr }) : '—'}</span>
                  <span className="text-slate-500">{b.total_price ? `${b.total_price}€` : '—'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    Facture: {b.billing_status === 'avance_immediate' ? 'Avance Immédiate' : b.billing_status === 'generated' ? 'Générée' : 'Non réglée'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingAiClients.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-blue-800">⚡ Action requise — Demande d'AI à effectuer ({pendingAiClients.length})</h3>
            </div>
            <p className="text-sm text-blue-700 mb-3">Ces clients ont complété leur dossier URSSAF. Vous devez effectuer manuellement la demande d'Avance Immédiate pour chacun.</p>
            <div className="space-y-2">
              {pendingAiClients.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-blue-100">
                  <span className="font-medium text-slate-800">{c.first_name} {c.last_name}</span>
                  <span className="text-slate-500">{c.email}</span>
                  <span className="text-slate-500">{c.phone}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">URSSAF complété — Faire la demande d'AI</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {refusedUrssafClients.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-orange-800">Clients avec URSSAF refusé ({refusedUrssafClients.length})</h3>
            </div>
            <div className="space-y-2">
              {refusedUrssafClients.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-orange-100">
                  <span className="font-medium text-slate-800">{c.first_name} {c.last_name}</span>
                  <span className="text-slate-500">{c.email}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">URSSAF refusé</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Interventions aujourd'hui</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{todayBookings.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg text-green-600">
                <CalendarIcon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Employées actives</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{activeEmployees.length}</p>
              </div>
              <div className="p-3 bg-pink-100 rounded-lg text-pink-600">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Cette semaine</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{weekBookings.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                <ClipboardList className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Heures planifiées</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{totalHours}h</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg text-orange-600">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Interventions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Interventions du jour</h2>
              <Button variant="ghost" className="text-sm text-slate-500 hover:text-slate-900">
                Voir tout <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {todayBookings.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-slate-500">Aucune intervention prévue aujourd'hui</p>
                </Card>
              ) : (
                todayBookings.map((booking) => (
                  <Card key={booking.id} className="p-4 border-none bg-white shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">
                            {booking.contact_details?.first_name} {booking.contact_details?.last_name}
                          </h4>
                          <p className="text-sm text-slate-500">{booking.address}, {booking.city}</p>
                          {booking.employee_id && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                              <Users className="w-3 h-3" />
                              <span>Assigné à: {
                                employees.find(e => e.id === booking.employee_id)?.first_name || 'Inconnu'
                              }</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{booking.time}</p>
                        <p className="text-xs text-slate-500">{booking.duration}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status === 'completed' ? 'Terminé' : 
                           booking.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Active Team */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Équipe active</h2>
              <Button variant="ghost" className="text-sm text-slate-500 hover:text-slate-900">
                Gérer <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <Card className="border-none shadow-sm bg-white p-6">
              <div className="space-y-6">
                {activeEmployees.slice(0, 5).map((employee) => (
                  <div key={employee.id} className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{employee.first_name} {employee.last_name}</p>
                      <p className="text-sm text-slate-500">{employee.phone}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2" title="Actif" />
                  </div>
                ))}
                {activeEmployees.length === 0 && (
                   <p className="text-slate-500 text-sm text-center">Aucun employé actif</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}