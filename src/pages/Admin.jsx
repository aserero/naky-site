import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { createPageUrl } from '@/utils';
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
import { Bookings, Clients, Employees } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { format, isToday, parseISO, startOfWeek, endOfWeek, isWithinInterval, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fr } from 'date-fns/locale';
import { BOOKING_STATUS_LABELS } from '@/lib/constants';
import { formatTime, formatDuration, durationToHours } from '@/lib/format';

export default function AdminDashboard() {
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

  // Calculate stats
  const today = new Date();

  // Alertes URSSAF / avance immédiate (basées sur clients.ai_status)
  const pendingAiClients = clients.filter(c => c.urssaf_completed && c.ai_status === 'completed');
  const refusedAiClients = clients.filter(c => c.ai_status === 'ai_refused');

  const todayBookings = bookings.filter(b => b.date && isToday(parseISO(b.date)));

  const activeEmployees = employees.filter(e => e.status === 'active');

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekBookings = bookings.filter(b =>
    b.date && isWithinInterval(parseISO(b.date), { start: weekStart, end: weekEnd })
  );

  const totalHours = weekBookings.reduce((acc, b) => acc + durationToHours(b.duration_minutes), 0);

  // Fenêtre du graphique : N mois passés + le mois courant + 2 mois à venir
  const CHART_PRESETS = [
    { key: '3m', label: '3 mois', past: 3 },
    { key: '6m', label: '6 mois', past: 6 },
    { key: '12m', label: '1 an', past: 12 },
  ];
  const [chartPreset, setChartPreset] = useState('3m');
  const pastMonths = CHART_PRESETS.find(p => p.key === chartPreset)?.past ?? 3;
  const futureMonths = 2;

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : '—';
  };

  const totalPeriod = pastMonths + futureMonths + 1;
  const monthlyHoursData = Array.from({ length: totalPeriod }, (_, i) => {
    const d = addMonths(today, i - pastMonths);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const monthBookings = bookings.filter(b => {
      if (!b.date) return false;
      const date = parseISO(b.date);
      return date >= start && date <= end;
    });
    const hours = monthBookings.reduce((acc, b) => acc + durationToHours(b.duration_minutes), 0);
    return {
      mois: format(d, 'MMM yy', { locale: fr }),
      heures: Math.round(hours * 10) / 10,
      isCurrent: i === pastMonths,
    };
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500 capitalize">
            {format(today, 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>

        {/* Graphique heures mensuelles */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Heures de ménage par mois
              </CardTitle>
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
                {CHART_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setChartPreset(p.key)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      chartPreset === p.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyHoursData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip formatter={(v) => [`${v}h`, 'Heures']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="heures" radius={[4, 4, 0, 0]}
                  fill="#4ade80"
                  label={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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

        {refusedAiClients.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-orange-800">Clients avec AI refusée ({refusedAiClients.length})</h3>
            </div>
            <div className="space-y-2">
              {refusedAiClients.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-orange-100">
                  <span className="font-medium text-slate-800">{c.first_name} {c.last_name}</span>
                  <span className="text-slate-500">{c.email}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Avance immédiate refusée</span>
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
                <p className="text-3xl font-bold text-slate-900 mt-2">{formatDuration(Math.round(totalHours * 60))}</p>
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
              <Link to={createPageUrl('AdminBookings')}>
                <Button variant="ghost" className="text-sm text-slate-500 hover:text-slate-900">
                  Voir tout <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
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
                            {getClientName(booking.client_id)}
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
                        <p className="font-bold text-slate-900">{formatTime(booking.start_time)}</p>
                        <p className="text-xs text-slate-500">{formatDuration(booking.duration_minutes)}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {BOOKING_STATUS_LABELS[booking.status] || booking.status}
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
              <Link to={createPageUrl('AdminEmployees')}>
                <Button variant="ghost" className="text-sm text-slate-500 hover:text-slate-900">
                  Gérer <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
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
