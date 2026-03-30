import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User 
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayBookings = (date) => {
    return bookings.filter(b => b.date && isSameDay(parseISO(b.date), date));
  };

  const selectedDayBookings = getDayBookings(selectedDate);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 capitalize flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              {format(currentDate, 'MMMM yyyy', { locale: fr })}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide py-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1 auto-rows-fr">
            {calendarDays.map((day, dayIdx) => {
              const dayBookings = getDayBookings(day);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <div
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    border-b border-r min-h-[100px] p-2 cursor-pointer transition-colors relative
                    ${!isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'bg-white'}
                    ${isSelected ? 'ring-2 ring-inset ring-green-500 z-10' : 'hover:bg-slate-50'}
                  `}
                >
                  <div className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1
                    ${isSameDay(day, new Date()) ? 'bg-green-600 text-white' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayBookings.slice(0, 3).map((booking) => (
                      <div 
                        key={booking.id} 
                        className={`text-[10px] px-1 py-0.5 rounded truncate ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {booking.time} - {booking.contact_details?.last_name || 'Client'}
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-[10px] text-slate-400 pl-1">
                        + {dayBookings.length - 3} autres
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Details */}
        <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-4 border-b bg-slate-50">
            <h3 className="font-bold text-lg capitalize text-slate-900">
              {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </h3>
            <p className="text-sm text-slate-500">{selectedDayBookings.length} interventions</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedDayBookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic">
                Aucune intervention ce jour-là
              </div>
            ) : (
              selectedDayBookings.map(booking => (
                <Card key={booking.id} className="border border-slate-100 shadow-sm">
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className={
                        booking.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-100 border-none' :
                        booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-none' :
                        'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none'
                      }>
                        {booking.time}
                      </Badge>
                      <span className="text-xs text-slate-500">{booking.duration}</span>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 mb-1">
                      {booking.contact_details?.first_name} {booking.contact_details?.last_name}
                    </h4>
                    
                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{booking.address}, {booking.city}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>
                          {employees.find(e => e.id === booking.employee_id)?.first_name || 'Non assigné'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}