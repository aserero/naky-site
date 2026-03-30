import React from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, User, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function InterventionCard({ booking }) {
  return (
    <Card className="p-4 border-none bg-slate-50/50 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">
                {booking.client_name || booking.contact_details?.last_name || 'Client Inconnu'}
            </h4>
            <div className="flex items-center text-sm text-slate-500 mt-1 gap-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {booking.address}, {booking.city}
              </span>
              {booking.employee_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {booking.employee_name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-900">{booking.time}</p>
          <p className="text-xs text-slate-500">{booking.duration}</p>
          <Badge className="mt-2 bg-green-100 text-green-700 hover:bg-green-200 border-none">
            {booking.status === 'completed' ? 'Terminé' : booking.status === 'confirmed' ? 'Confirmé' : 'En attente'}
          </Badge>
        </div>
      </div>
    </Card>
  );
}